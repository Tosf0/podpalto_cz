"""Export of collected prices in the shape of docs/agent-output-spec.md (section 10).

Deterministic code, no LLM and no network: it reads the snapshot database, the registry
and the committed seller locations, and returns sellers, products, prices and runs. The
app's worker writes the result to Supabase; ``podpalto-export`` writes it to a JSON file.

What is converted here (spec sections 6.2-6.7): the seven fuel categories to the four of
the web app, units to PRMS / PRM / PLM / t / paleta / pytel with the price per one unit,
and product attributes read from the product name (wood species, log length, moisture,
pellet certification, briquette type, coal type). Rows the app cannot show are left out
and listed in ``skipped`` with the reason.
"""

from __future__ import annotations

import re
from collections.abc import Iterable
from datetime import datetime, timezone
from typing import Any, Literal

from pydantic import BaseModel, Field

from podpalto_tools.collect.locate import LocatedSeller
from podpalto_tools.collect.normalize import SolidFuelPriceRecord, fold
from podpalto_tools.collect.source_registry import Source
from podpalto_tools.collect.store import Snapshot, Store
from podpalto_tools.schemas import FuelType, Region
from podpalto_tools.settings import get_settings

SCHEMA_VERSION = "1.0"

# --- models: the spec's field names ----------------------------------------------------------


class ExportRun(BaseModel):
    """One snapshot of one source (spec section 8)."""

    snapshot_id: int
    source_id: str
    seller_key: str
    agent: str = "collection"
    status: Literal["ok", "error", "blocked_by_robots"]
    fetched_at: str
    http_status: int | None = None
    content_sha256: str | None = None
    changed: bool | None = None
    item_count: int | None = None
    offer_count: int | None = None
    error: str | None = None
    exported_count: int = 0
    skipped_count: int = 0


class ExportSeller(BaseModel):
    """Spec section 5; only what the collection knows (no delivery terms or rating yet)."""

    seller_key: str
    source_ids: list[str]
    name: str
    company_ico: str | None = None
    legal_name: str | None = None
    website: str
    address: dict[str, Any]
    location: dict[str, Any] | None = None
    registry: dict[str, Any]
    flags: list[str] = Field(default_factory=list)


class ExportProduct(BaseModel):
    """Spec section 6."""

    product_key: str
    seller_key: str
    item_id: str
    group_id: str | None = None
    name: str
    name_raw: str
    category: Literal["wood", "pellets", "briquettes", "coal"]
    unit: Literal["PRMS", "PRM", "PLM", "t", "paleta", "pytel"]
    package_kg: float | None = None
    package_prm: float | None = None
    stock: Literal["in_stock", "out_of_stock"] | None = None
    delivery_days: int | None = None
    source_url: str
    declared_mj_per_kg: float | None = None
    active: bool = True
    # wood (6.2)
    wood_species: list[str] | None = None
    wood_species_raw: str | None = None
    wood_group: Literal["hard", "soft", "birch"] | None = None
    wood_form: Literal["sypane", "rovnane", "metrovky", "paleta"] | None = None
    moisture: Literal["dry", "semi", "fresh"] | None = None
    moisture_percent: float | None = None
    log_length_cm: int | None = None
    log_length_cm_exact: float | None = None
    # pellets (6.3)
    certification: str | None = None
    diameter_mm: float | None = None
    # briquettes (6.4)
    briquette_type: str | None = None
    briquette_material: Literal["wood", "coal"] | None = None
    # coal (6.5)
    coal_type: str | None = None
    coal_origin: str | None = None
    grain_mm: str | None = None
    quality_raw: str | None = None
    # variants (spec section 7): the map and the statistics show only regular products
    is_promo: bool = False
    promo_valid_until: str | None = None
    price_tier: dict[str, Any] | None = Field(
        None, description='Quantity price: {"min_quantity": 1.5, "unit": "t"}'
    )
    base_product_key: str | None = Field(
        None, description="The regular product this variant belongs to, when unambiguous"
    )
    flags: list[str] = Field(default_factory=list)


class ExportPrice(BaseModel):
    """Spec section 7: one price of one product, incl. VAT, per one ``unit`` of the product."""

    product_key: str
    price_czk: float
    observed_at: str
    vat_status: Literal["included", "added", "assumed"]
    source_url: str
    original_price: float
    original_unit: str
    original_quantity: float
    original_price_includes_vat: bool
    valid_in_regions: list[str] | None = None
    delivery_included: bool | None = None
    normalized: dict[str, Any] = Field(default_factory=dict)
    snapshot_id: int
    flags: list[str] = Field(default_factory=list)


class Skipped(BaseModel):
    source_id: str
    item_id: str | None = None
    reason: str


class ExportPayload(BaseModel):
    schema_version: str = SCHEMA_VERSION
    generated_at: str
    since: str | None = None
    runs: list[ExportRun] = Field(default_factory=list)
    sellers: list[ExportSeller] = Field(default_factory=list)
    products: list[ExportProduct] = Field(default_factory=list)
    price_observations: list[ExportPrice] = Field(default_factory=list)
    skipped: list[Skipped] = Field(default_factory=list)


# --- categories and units (spec 6.6, 6.7) ----------------------------------------------------

CATEGORY = {
    FuelType.FIREWOOD: "wood",
    FuelType.WOOD_PELLETS: "pellets",
    FuelType.WOOD_BRIQUETTES: "briquettes",
    FuelType.COAL_BRIQUETTES: "briquettes",
    FuelType.BROWN_COAL: "coal",
    FuelType.BLACK_COAL: "coal",
    FuelType.COKE: "coal",
}

# Flags that make a row impossible to show: the spec says not to send it (section 9).
NOT_SENT = {"package_size_unknown", "volume_stacking_unknown", "unit_not_by_weight"}
# Flags about the product itself; all the others describe one reading of the price. A price
# flag on the product would keep it in review after a clean price (DB trigger).
PRODUCT_FLAGS = {
    "wood_species_unknown",
    "long_wood_not_comparable",
    "fresh_wood_no_energy_value",
    "certification_unverified",
    "moisture_class_from_text",
}


def unit_and_price(record: SolidFuelPriceRecord) -> tuple[str, float, float | None] | str:
    """(unit, price incl. VAT per one unit, package_kg), or the reason it cannot be shown."""
    unit, quantity = record.original_unit, record.original_quantity or 1.0
    price = record.original_price_vat / quantity
    if unit == "prms":
        return "PRMS", price, None
    if unit == "prmr":
        return "PRM", price, None
    if unit == "m3":  # on price lists 'm3' is the solid metre; e-shop m3 are flagged before
        return "PLM", price, None
    if unit == "t":
        return "t", price, None
    if unit == "q":
        return "t", price * 10, None
    if unit == "kg":
        return "t", price * 1000, None
    if unit in ("bag", "pallet"):
        if not record.package_weight_kg:
            return "package_size_unknown"
        if unit == "pallet" and record.fuel_category is FuelType.FIREWOOD:
            return "wood_pallet_without_volume"  # the web app needs package_prm for wood
        return ("pytel" if unit == "bag" else "paleta"), price, record.package_weight_kg
    return "package_size_unknown"


# --- attributes read from the name (spec 6.2-6.5) ----------------------------------------------

_SPECIES = [
    (re.compile(r"\bbuk"), "buk"),
    (re.compile(r"\bdub|\bdubov"), "dub"),
    (re.compile(r"\bhabr"), "habr"),
    (re.compile(r"\bjasan"), "jasan"),
    (re.compile(r"\bbriz|\bbrez"), "briza"),
    (re.compile(r"\bsmrk"), "smrk"),
    (re.compile(r"\bborov"), "borovice"),
    (re.compile(r"\bmodrin"), "modrin"),
]
_OTHER_HARD = re.compile(r"\b(akat\w*|javor\w*)")
_OTHER_SOFT = re.compile(r"\b(topol\w*|ols\w*|osik\w*|lip\w*|vrb\w*|jedl\w*)")
_HARD_WORDS = re.compile(r"tvrd|listnat")
_SOFT_WORDS = re.compile(r"mekk|jehlic")
HARD = {"buk", "dub", "habr", "jasan", "mix-tvrde"}
SOFT = {"smrk", "borovice", "modrin", "mix-mekke"}
_LONG_WOOD = re.compile(r"\b\d+(?:[.,]\d+)?\s*(?:-\s*\d+\s*)?m\b|metrov|\bklad(?:a|y)?\b|kulatin")
_LENGTH_RANGE = re.compile(r"\b(\d{2,3})\s*(?:-|–|az)\s*(\d{2,3})\s*cm")
_LENGTH = re.compile(r"\b(\d{2,3})\s*cm")
_ONE_METRE = re.compile(r"\b1\s*m\b|metrov")
NOMINAL_LENGTHS = (25, 33, 40, 50, 100)
_MOISTURE_PCT = re.compile(r"(\d{1,2})(?:[.,]\d)?\s*%")
_DRY = re.compile(r"\bsuch|\bvysus|susarn")
_SEMI = re.compile(r"polosuch|prosch")
_FRESH = re.compile(r"cerstv|syrov|surov")


def wood_attributes(name: str, unit: str) -> tuple[dict[str, Any], list[str]]:
    folded = fold(name)
    flags: list[str] = []
    species = [label for pattern, label in _SPECIES if pattern.search(folded)]
    raw = None
    if not species:
        if other := _OTHER_HARD.search(folded):
            species, raw = ["mix-tvrde"], other.group(1)
        elif other := _OTHER_SOFT.search(folded):
            species, raw = ["mix-mekke"], other.group(1)
        elif _HARD_WORDS.search(folded):
            species = ["mix-tvrde"]
        elif _SOFT_WORDS.search(folded):
            species = ["mix-mekke"]
    groups = {"hard" if s in HARD else "soft" if s in SOFT else "birch" for s in species}

    if _LONG_WOOD.search(folded) or _ONE_METRE.search(folded):
        form = "metrovky"
    else:
        form = {"PRMS": "sypane", "PRM": "rovnane", "paleta": "paleta"}.get(unit)

    exact = None
    if match := _LENGTH_RANGE.search(folded):
        nominal_from = (int(match.group(1)) + int(match.group(2))) / 2
    elif match := _LENGTH.search(folded):
        exact = float(match.group(1))
        nominal_from = exact
    else:
        nominal_from = 100 if form == "metrovky" else None
    nominal = None
    if nominal_from is not None:
        nominal = min(NOMINAL_LENGTHS, key=lambda length: abs(length - nominal_from))

    percent = None
    if "vlhk" in folded and (match := _MOISTURE_PCT.search(folded)):
        percent = float(match.group(1))
    if percent is not None:
        moisture = "dry" if percent < 20 else "semi" if percent <= 35 else "fresh"
    elif _SEMI.search(folded):
        moisture = "semi"
    elif _DRY.search(folded):
        moisture = "dry"
    elif _FRESH.search(folded):
        moisture = "fresh"
    else:
        moisture = None
    if moisture and percent is None:
        flags.append("moisture_class_from_text")

    return {
        "wood_species": species or None,
        "wood_species_raw": raw,
        "wood_group": groups.pop() if len(groups) == 1 else None,
        "wood_form": form,
        "moisture": moisture,
        "moisture_percent": percent,
        "log_length_cm": nominal,
        "log_length_cm_exact": exact,
    }, flags


_DIAMETER = re.compile(r"\b(6|8)\s*mm")


def pellet_attributes(text: str, quality: str | None) -> tuple[dict[str, Any], list[str]]:
    folded = fold(f"{text} {quality or ''}")
    flags: list[str] = []
    if re.search(r"en\s?plus", folded):
        certification = "ENplus A2" if re.search(r"\ba2\b", folded) else "ENplus A1"
    elif re.search(r"din\s?plus", folded):
        certification = "DINplus"
    else:
        certification = "bez certifikace"
        if re.search(r"\ba1\b|\ba2\b", folded):
            flags.append("certification_unverified")  # "A1" alone is no certificate (6.3)
    diameter = _DIAMETER.search(folded)
    return {
        "certification": certification,
        "diameter_mm": float(diameter.group(1)) if diameter else None,
        "quality_raw": quality,
    }, flags


def briquette_attributes(text: str, fuel: FuelType, quality: str | None) -> dict[str, Any]:
    folded = fold(text)
    if fuel is FuelType.COAL_BRIQUETTES:
        kind, material = "hnědouhelné", "coal"
    else:
        material = "wood"
        if re.search(r"pini|\bkay\b|s otvorem", folded):
            kind = "PINI KAY"
        elif re.search(r"\bruf\b|hranol|cihl|kvadr", folded):
            kind = "RUF"
        elif re.search(r"valec|valc|kulat", folded):
            kind = "válcové"
        else:
            kind = None
    return {"briquette_type": kind, "briquette_material": material, "quality_raw": quality}


_GRAIN = re.compile(r"\b(\d{1,3})\s*(?:-|–)\s*(\d{1,3})\s*mm")
_ORIGINS = [
    (re.compile(r"bilin"), "SD Bílina"),
    (re.compile(r"vrsan"), "Vršanská uhelná"),
    (re.compile(r"sokolov"), "Sokolovská uhelná"),
    (re.compile(r"\bpolsk"), "polské"),
]


def coal_attributes(text: str, fuel: FuelType, quality: str | None) -> dict[str, Any]:
    folded = fold(f"{text} {quality or ''}")
    if fuel is FuelType.COKE:
        coal_type = "koks"
    else:
        prefix = "hnědé" if fuel is FuelType.BROWN_COAL else "černé"
        if re.search(r"kostk", folded):
            coal_type = f"{prefix} kostka"
        elif fuel is FuelType.BROWN_COAL and re.search(r"orech\s*1|\bo1\b", folded):
            coal_type = "hnědé ořech 1"
        elif fuel is FuelType.BROWN_COAL and re.search(r"orech\s*2|\bo2\b", folded):
            coal_type = "hnědé ořech 2"
        elif fuel is FuelType.BLACK_COAL and re.search(r"orech", folded):
            coal_type = "černé ořech"
        else:
            coal_type = None  # hruboprach, ekohrášek, smithing coal: no matching type
    grain = _GRAIN.search(folded)
    origin = next((label for pattern, label in _ORIGINS if pattern.search(folded)), None)
    return {
        "coal_type": coal_type,
        "coal_origin": origin,
        "grain_mm": f"{grain.group(1)}–{grain.group(2)} mm" if grain else None,
        "quality_raw": quality,
    }


# --- sellers -------------------------------------------------------------------------------

_LEGAL_FORM = re.compile(
    r",?\s*(spol\.\s*s\s*r\.\s*o\.|s\.\s*r\.\s*o\.|a\.\s*s\.|k\.\s*s\.|v\.\s*o\.\s*s\.|"
    r"příspěvková organizace|p\.\s*o\.|z\.\s*s\.|o\.\s*p\.\s*s\.)\s*$",
    re.IGNORECASE,
)


def display_name(source: Source, legal_name: str | None) -> str:
    """The registry's trade name, else the ARES name without the legal form, else the domain."""
    if source.name:
        return source.name
    if legal_name:
        name = _LEGAL_FORM.sub("", legal_name).strip(" ,")
        if len(name) >= 2:
            return name
    return source.seller


def export_seller(source: Source, located: LocatedSeller) -> ExportSeller | None:
    if located.address is None:
        return None
    location = None
    if located.location is not None:
        location = located.location.model_dump() | {"checked_at": located.checked_at}
    registry = located.registry.model_dump() | {"checked_at": located.checked_at}
    return ExportSeller(
        seller_key=located.seller_key,
        source_ids=[source.id],
        name=display_name(source, located.registry.name),
        company_ico=located.registry.ico,
        legal_name=located.registry.name,
        website=source.origin,
        address=located.address.model_dump(),
        location=location,
        registry=registry,
        flags=list(located.flags),
    )


# --- products and prices -----------------------------------------------------------------------


def _valid_in(source: Source) -> list[str] | None:
    region = source.price_region
    if region is None:
        return None
    return ["CZ"] if region is Region.CZ else [region.code] if region.code else None


def _vat_status(flags: list[str]) -> str:
    if "vat_added" in flags:
        return "added"
    if "vat_assumed_from_registry" in flags:
        return "assumed"
    return "included"


def _normalized(record: SolidFuelPriceRecord) -> dict[str, Any]:
    values = {
        "per_kg": record.normalized_price_per_kg_vat,
        "per_t": record.normalized_price_per_ton_vat,
        "per_prms": record.normalized_price_per_prms_vat,
        "per_kwh": record.energy_price_per_kwh_vat,
        "calorific_mj_kg": record.calorific_value_mj_kg,
        "calorific_source": record.calorific_source,
    }
    return {key: value for key, value in values.items() if value is not None}


def export_record(
    record: SolidFuelPriceRecord, source: Source, seller_key: str, snapshot_id: int
) -> tuple[ExportProduct, ExportPrice] | str:
    """The product and its price, or the reason the row is not sent."""
    blocked = NOT_SENT.intersection(record.flags)
    if blocked:
        return sorted(blocked)[0]
    converted = unit_and_price(record)
    if isinstance(converted, str):
        return converted
    unit, price, package_kg = converted
    if price <= 0:
        return "price_not_positive"

    fuel = record.fuel_category
    name = record.product_name_raw
    product_flags = [flag for flag in record.flags if flag in PRODUCT_FLAGS]
    attributes: dict[str, Any] = {}
    if fuel is FuelType.FIREWOOD:
        attributes, extra = wood_attributes(name, unit)
        product_flags += extra
    elif fuel is FuelType.WOOD_PELLETS:
        attributes, extra = pellet_attributes(name, record.quality_standard)
        product_flags += extra
    elif fuel in (FuelType.WOOD_BRIQUETTES, FuelType.COAL_BRIQUETTES):
        attributes = briquette_attributes(name, fuel, record.quality_standard)
    else:
        attributes = coal_attributes(name, fuel, record.quality_standard)

    product_key = f"{seller_key}:{record.item_id}"
    stock = None if record.in_stock is None else "in_stock" if record.in_stock else "out_of_stock"
    product = ExportProduct(
        product_key=product_key,
        seller_key=seller_key,
        item_id=record.item_id,
        group_id=record.group_id,
        name=name[:200],
        name_raw=name,
        category=CATEGORY[fuel],
        unit=unit,
        package_kg=package_kg,
        stock=stock,
        delivery_days=record.delivery_days,
        source_url=record.source_url,
        declared_mj_per_kg=(
            record.calorific_value_mj_kg if record.calorific_source == "seller" else None
        ),
        flags=sorted(set(product_flags)),
        **attributes,
    )
    observation = ExportPrice(
        product_key=product_key,
        price_czk=round(price, 2),
        observed_at=record.scraped_at or "",
        vat_status=_vat_status(record.flags),
        source_url=record.source_url,
        original_price=record.original_price,
        original_unit=record.original_unit or "",
        original_quantity=record.original_quantity,
        original_price_includes_vat=record.price_includes_vat,
        valid_in_regions=_valid_in(source),
        delivery_included=record.delivery_included,
        normalized=_normalized(record),
        snapshot_id=snapshot_id,
        flags=[flag for flag in record.flags if flag not in PRODUCT_FLAGS],
    )
    return product, observation


# --- variants: promotions, quantity tiers, price zones (spec section 7) -------------------------

# Price-list rows are named "<product> – <variant>" (pricelist.verify_row); the variant text
# says whether the row is a quantity price, a promotion or a delivery-zone price.
_VARIANT_SEP = " – "
_ZONE = re.compile(r"^(0|i{1,3}|iv|\d)\.?\s*cenove pasmo$")
_PROMO = re.compile(r"vernostni slev|\bakce\b|\bakcni\b|vyprodej|\bsleva\b")
_REGULAR_TIER = re.compile(r"^(?:cena )?do \d+(?:[.,]\d+)?\s*q$|kusov\w* prodej")
_PALLET_TIER = re.compile(r"paletov\w* prodej|(?:cela|celou) palet")
_TIER = re.compile(
    r"(?:nad|od|pri odberu)\s+(\d+(?:[.,]\d+)?)\s*(q|t|kg|prms|prm|palet\w*)?"
    r"(?:\s+a\s+vice)?(?:\s+(q|t|kg|prms|prm|palet\w*))?\b"
)
_TIER_UNITS = {"q": ("t", 0.1), "t": ("t", 1.0), "kg": ("t", 0.001), "prm": ("PRM", 1.0),
               "prms": ("PRMS", 1.0)}  # fmt: skip


class Variant(BaseModel):
    kind: Literal["regular", "tier", "promo", "zone"] = "regular"
    base_name: str
    tier: dict[str, Any] | None = None


def variant_of(name: str, unit: str) -> Variant:
    """What the text after the last ' – ' says about the row (regular when nothing)."""
    base, sep, suffix = name.rpartition(_VARIANT_SEP)
    if not sep:
        return Variant(base_name=name)
    text = fold(" ".join(suffix.split())).rstrip("!. ")
    if _ZONE.match(text):
        return Variant(kind="zone", base_name=base)
    if _PROMO.search(text):
        return Variant(kind="promo", base_name=base)
    if _REGULAR_TIER.search(text):
        return Variant(base_name=base)
    if _PALLET_TIER.search(text):
        return Variant(kind="tier", base_name=base, tier={"min_quantity": 1, "unit": "paleta"})
    if match := _TIER.search(text):
        amount = float(match.group(1).replace(",", "."))
        raw_unit = (match.group(2) or match.group(3) or "").lower()
        if raw_unit.startswith("palet"):
            tier_unit, factor = "paleta", 1.0
        else:
            tier_unit, factor = _TIER_UNITS.get(raw_unit, (unit, 1.0))
        tier = {"min_quantity": round(amount * factor, 3), "unit": tier_unit}
        return Variant(kind="tier", base_name=base, tier=tier)
    return Variant(base_name=name)  # e.g. "Buk – prms": the variant is the product itself


Row = tuple[SolidFuelPriceRecord, ExportProduct, ExportPrice]


def apply_variants(rows: list[Row]) -> list[tuple[SolidFuelPriceRecord, str]]:
    """Mark promotions and quantity tiers, link them to their regular product, and merge
    delivery-zone prices; returns the rows left out (record, reason). Works on one snapshot.

    Zone prices (Havelka "0.–III. cenové pásmo") depend on the customer's delivery zone, which
    the web app cannot map yet: the cheapest zone stays as one product with ``price_from``.
    """
    dropped: list[tuple[SolidFuelPriceRecord, str]] = []
    variants = [variant_of(product.name_raw, product.unit) for _, product, _ in rows]

    zones: dict[tuple, list[int]] = {}
    for index, ((_, product, _), variant) in enumerate(zip(rows, variants, strict=True)):
        if variant.kind == "zone":
            key = (variant.base_name, product.unit, product.package_kg)
            zones.setdefault(key, []).append(index)
    keep = set(range(len(rows)))
    for members in zones.values():
        cheapest = min(members, key=lambda i: rows[i][2].price_czk)
        _, product, observation = rows[cheapest]
        product.name = variants[cheapest].base_name[:200]
        variants[cheapest] = Variant(base_name=variants[cheapest].base_name)
        if (
            len({rows[i][2].price_czk for i in members}) > 1
            and "price_from" not in observation.flags
        ):
            observation.flags.append("price_from")
        for index in members:
            if index != cheapest:
                keep.discard(index)
                dropped.append((rows[index][0], "price_zone_variant"))

    regular: dict[tuple, list[str]] = {}
    for index in keep:
        _, product, _ = rows[index]
        if variants[index].kind == "regular":
            key = (variants[index].base_name, product.unit, product.package_kg)
            regular.setdefault(key, []).append(product.product_key)
    for index in keep:
        _, product, _ = rows[index]
        variant = variants[index]
        if variant.kind not in ("tier", "promo"):
            continue
        product.is_promo = variant.kind == "promo"
        product.price_tier = variant.tier
        bases = regular.get((variant.base_name, product.unit, product.package_kg), [])
        product.base_product_key = bases[0] if len(bases) == 1 else None
    rows[:] = [row for index, row in enumerate(rows) if index in keep]
    return dropped


# --- the payload -------------------------------------------------------------------------------


def _when(value: str) -> datetime:
    parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    return parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)


def _newest(snapshots: Iterable[Snapshot], since: datetime | None) -> dict[str, list[Snapshot]]:
    """Per source: the newest successful snapshot and a newer failed one, if any."""
    by_source: dict[str, list[Snapshot]] = {}
    for snapshot in snapshots:
        if since is not None and _when(snapshot.fetched_at) < since:
            continue
        by_source.setdefault(snapshot.source_id, []).append(snapshot)
    picked: dict[str, list[Snapshot]] = {}
    for source_id, items in by_source.items():
        ok = [s for s in items if s.status == "ok"]
        newest_ok = max(ok, key=lambda s: s.id) if ok else None
        failed = [s for s in items if s.status != "ok" and (not newest_ok or s.id > newest_ok.id)]
        picked[source_id] = [s for s in [newest_ok, max(failed, key=lambda s: s.id, default=None)]
                             if s is not None]  # fmt: skip
    return picked


def build_export(
    store: Store,
    sources: list[Source],
    locations: dict[str, LocatedSeller],
    since: str | None = None,
    now: datetime | None = None,
    snapshot_offset: int | None = None,
) -> ExportPayload:
    """Sellers, products, prices and runs of the newest snapshot of every given source.

    ``since`` (ISO time) keeps only snapshots fetched at or after it, e.g. the start of the
    collection job; without it the newest snapshot of each source is exported.
    """
    payload = ExportPayload(
        generated_at=(now or datetime.now(timezone.utc)).isoformat(timespec="seconds"),
        since=since,
    )
    by_id = {source.id: source for source in sources}
    offset = get_settings().export_snapshot_offset if snapshot_offset is None else snapshot_offset
    picked = _newest(store.snapshots(), _when(since) if since else None)
    sellers: dict[str, ExportSeller] = {}
    for source_id in sorted(picked):
        source = by_id.get(source_id)
        if source is None:
            continue  # not in the registry any more, or disabled
        if not source.export:
            payload.skipped.append(Skipped(source_id=source_id, reason="export_disabled"))
            continue  # collected for the tools only; no seller, products or runs on the web
        seller_key = source.export_seller_key
        for snapshot in picked[source_id]:
            exported_id = snapshot.id + offset
            run = ExportRun(
                snapshot_id=exported_id, source_id=source_id, seller_key=seller_key,
                status=snapshot.status, fetched_at=snapshot.fetched_at,
                http_status=snapshot.http_status, content_sha256=snapshot.content_sha256,
                changed=snapshot.changed, item_count=snapshot.item_count,
                offer_count=snapshot.offer_count, error=snapshot.error,
            )  # fmt: skip
            payload.runs.append(run)
            if snapshot.status != "ok":
                continue
            seller = sellers.get(seller_key)
            if seller is None:
                located = locations.get(seller_key)
                seller = export_seller(source, located) if located else None
                reason = "seller_not_located" if located is None else "seller_without_address"
                if seller is None:
                    run.skipped_count = snapshot.offer_count or 0
                    payload.skipped.append(Skipped(source_id=source_id, reason=reason))
                    continue
                sellers[seller_key] = seller
            elif source_id not in seller.source_ids:
                seller.source_ids.append(source_id)
            rows: list[Row] = []
            left_out: list[tuple[SolidFuelPriceRecord, str]] = []
            for record in store.records(snapshot.id):
                result = export_record(record, source, seller_key, exported_id)
                if isinstance(result, str):
                    left_out.append((record, result))
                else:
                    rows.append((record, *result))
            left_out += apply_variants(rows)
            for record, reason in left_out:
                payload.skipped.append(
                    Skipped(source_id=source_id, item_id=record.item_id, reason=reason)
                )
            for _, product, observation in rows:
                payload.products.append(product)
                payload.price_observations.append(observation)
            run.exported_count, run.skipped_count = len(rows), len(left_out)
    payload.sellers = list(sellers.values())
    return payload
