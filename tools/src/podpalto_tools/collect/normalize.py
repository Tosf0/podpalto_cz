"""Turns raw prices into comparable records. Plain rules, no LLM.

The record follows the Pydantic contract of the source report (PDF, section 4.3,
``SolidFuelPriceRecord``); the conversions follow its section 3 (unit matrix, energy
normalisation, logistics). Every number is computed here, never by a language model
(PDF, section 4.4).

Two kinds of input end up in the same record:

* ``normalize``           a product of a feed or a Shoptet product page (``FeedItem``)
* ``normalize_extracted`` a row of a price list that the extraction crew quoted verbatim
                          (see ``pricelist.py``; the numbers are parsed here, not by the LLM)

Whenever the rules cannot tell, the record keeps its price but gets no unit price and a
flag. A missing figure is better than a wrong one.
"""

from __future__ import annotations

import re
import unicodedata
from dataclasses import dataclass, field
from typing import Literal

from pydantic import BaseModel, Field

from podpalto_tools.collect.heureka import FeedItem
from podpalto_tools.collect.source_registry import Source
from podpalto_tools.schemas import WEIGHT_FUELS, FuelType

OriginalUnit = Literal["kg", "q", "t", "bag", "pallet", "m3", "prmr", "prms"]
VAT_RATE = 0.21

# --- 1. classification -------------------------------------------------------------------

# Matched against the name without diacritics. Order matters: "uhelne brikety" are coal
# briquettes, "drevene pelety" must not fall through to firewood.
_COAL = re.compile(r"\buhli\b|\buheln|ekohrasek")
_BLACK_COAL = re.compile(r"\bcern\w* uhli|\bcern\w* ekohrasek|\bkovarsk|\bcernouheln")
_COAL_BRIQUETTE = re.compile(r"\brekord|hnedouheln\w* briket|uheln\w* briket")
_BASE_RULES: list[tuple[str, re.Pattern[str]]] = [
    ("coke", re.compile(r"\bkoks")),
    ("coal", _COAL),
    ("pellets", re.compile(r"pelet")),
    ("briquettes", re.compile(r"briket")),
    ("firewood", re.compile(r"palivov\w* drev|stipan|polen|polin|kulatin")),
]
# Things fuel shops sell next to fuel: vouchers, wood chips, compost, firelighters,
# charcoal for grilling, timber, chopping blocks; and appliances, their accessories and
# spare parts ("ND" = náhradní díl), which often carry a fuel in their name.
_NOT_FUEL = re.compile(
    r"poukaz|stepk|mulc|kompost|podpalov|drevene uhli|grilov|\blat\b|\bkura\b|na stipani"
    r"|kourovod|horak|vysavac|\bkamna\b|kamnum|\bkotel\b|\bkrb\b|vlozk|sporak|zasobnik"
    r"|\bnd\b|\brost\b|hadice|hridel|\bmodul"
)


def fold(text: str) -> str:
    """Lower-case and strip diacritics: 'Dřevěné uhlí' -> 'drevene uhli'."""
    decomposed = unicodedata.normalize("NFKD", text.lower())
    return "".join(ch for ch in decomposed if not unicodedata.combining(ch))


def classify(name: str, category: str = "") -> FuelType | None:
    """Fuel category of a product, or None when it is not a solid fuel."""
    folded_name, folded_category = fold(name), fold(category)
    if _NOT_FUEL.search(folded_name):
        return None
    for text in (folded_name, folded_category):
        base = next((kind for kind, pattern in _BASE_RULES if pattern.search(text)), None)
        if base is None:
            continue
        if base == "coke":
            return FuelType.COKE
        if base == "pellets":
            return FuelType.WOOD_PELLETS
        if base == "firewood":
            return FuelType.FIREWOOD
        if base == "briquettes":
            # "Brikety Rekord" filed under "Uhlí a uhelné brikety" are coal briquettes.
            in_coal_category = _COAL.search(folded_category) and "drev" not in folded_name
            if _COAL_BRIQUETTE.search(folded_name) or in_coal_category:
                return FuelType.COAL_BRIQUETTES
            return FuelType.WOOD_BRIQUETTES
        # coal
        if "briket" in folded_name or _COAL_BRIQUETTE.search(folded_name):
            return FuelType.COAL_BRIQUETTES
        if _BLACK_COAL.search(folded_name):
            return FuelType.BLACK_COAL
        return FuelType.BROWN_COAL  # the usual household coal in CZ (SD Bílina etc.)
    return None


_QUALITY_RULES: list[tuple[re.Pattern[str], str]] = [
    (re.compile(r"en\s*-?\s*plus\s*a1|\benplus\s*a1"), "ENplus A1"),
    (re.compile(r"en\s*-?\s*plus\s*a2|\benplus\s*a2"), "ENplus A2"),
    (re.compile(r"din\s*-?\s*plus"), "DINplus"),
    (re.compile(r"\bbilin"), "SD Bílina"),
]
_REKORD = re.compile(r"\brekord\s*(\d)")


def quality_standard(name: str) -> str | None:
    """Certification or grade named in the product name (ENplus A1, Rekord 4", SD Bílina)."""
    folded = fold(name)
    found = [label for pattern, label in _QUALITY_RULES if pattern.search(folded)]
    if rekord := _REKORD.search(folded):
        found.append(f'Rekord {rekord.group(1)}"')
    return ", ".join(found) or None


# --- 2. package size ---------------------------------------------------------------------

_N = r"(\d+(?:[.,]\d+)?)"
# "975kg", "1050 Kg", "975 kg/paleta"; not densities such as "650 kg/rm".
_KG = re.compile(_N + r"\s*kg\b(?!\s*/\s*(?:p?rm|m3|m³|l\b))", re.I)
# "70 ks po 15 kg", "96 x balení 10 kg", "40x pytel 25 kg", "90 kusů balení x 10 kg"
_PACKS = re.compile(
    r"(\d+)\s*(?:ks|kus\w*|x|×)\s*(?:po\s+|balen\w*\s+|pyt\w*\s+|x\s*|×\s*)*" + _N + r"\s*kg\b",
    re.I,
)
_COUNT = re.compile(r"\s*(\d+)\s*(?:ks|pyt)", re.I)
_VOLUME = re.compile(_N + r"\s*(prms|prmr|prm|sprm|m3|m³)(?![a-z0-9])", re.I)

# "PELETY ... s dopravou do 30 km - 12,90 Kč/kg": the seller states the unit price itself.
# Matched against the name without diacritics.
_STATED_CZK_PER_KG = re.compile(_N + r"\s*kc\s*/\s*kg")

_WEIGHT_PARAM = re.compile(r"balen|hmotnost|mnozstvi|palet|velikost")
_NOT_WEIGHT_PARAM = re.compile(r"objemov|rozmer|vyska")
_VOLUME_PARAM = re.compile(r"objem|mnozstvi|balen")


def _num(raw: str) -> float:
    return float(raw.replace(",", "."))


def weights_in(text: str) -> list[float]:
    weights = [_num(m.group(1)) for m in _KG.finditer(text)]
    weights += [int(m.group(1)) * _num(m.group(2)) for m in _PACKS.finditer(text)]
    return weights


def package_weight_kg(item: FeedItem) -> float | None:
    """Weight of what the price buys, in kg.

    The name wins over parameters: variants repeat their size in the name
    ("... paleta 960 kg (96 x balení 10 kg)") while parameters may list every variant.
    Within one text the largest figure is the package, the smaller ones are its parts.
    """
    candidates = weights_in(item.name)
    if not candidates:
        for key, value in item.params.items():
            folded = fold(key)
            if not _WEIGHT_PARAM.search(folded) or _NOT_WEIGHT_PARAM.search(folded):
                continue
            candidates += weights_in(value)
            # "Balení v 10kg PE foliích - na paletě": "96 ks"
            bag, count = _KG.search(key), _COUNT.match(value)
            if bag and count:
                candidates.append(_num(bag.group(1)) * int(count.group(1)))
    weight = max(candidates, default=0.0)
    return weight if weight > 0 else None


def firewood_volume(item: FeedItem) -> tuple[float, str] | None:
    """Volume and its unit: prms (loose), prmr (stacked) or m3 (stacking not stated).

    "prm" is the stacked metre (PDF, section 3.1: "1 PRM / PRMR"), "sprm" the loose one.
    A shop's "m3" without "sypané"/"rovnané" stays "m3": it may mean either.
    """
    texts = [item.name] + [
        value for key, value in item.params.items() if _VOLUME_PARAM.search(fold(key))
    ]
    for text in texts:
        match = _VOLUME.search(text)
        if not match:
            continue
        volume = _num(match.group(1))
        unit = {"prm": "prmr", "sprm": "prms", "m³": "m3"}.get(
            match.group(2).lower(), match.group(2).lower()
        )
        if unit == "m3":
            folded = fold(text)
            if "sypan" in folded:
                unit = "prms"
            elif "rovnan" in folded or "skladan" in folded:
                unit = "prmr"
        if volume > 0:
            return volume, unit
    return None


# --- 3. energy content (PDF, section 3.2) --------------------------------------------------

# Reference lower heating values in MJ/kg, the middle of the ranges in the report's table
# (TZB-info / ČSN EN ISO 17225). Used when the seller states none.
TYPICAL_MJ_PER_KG: dict[FuelType, float] = {
    FuelType.WOOD_PELLETS: 16.9,  # 16.5-17.3
    FuelType.WOOD_BRIQUETTES: 17.9,  # 17.0-18.8
    FuelType.BROWN_COAL: 18.0,  # 17.6-18.4
    FuelType.COAL_BRIQUETTES: 19.45,  # 19.0-19.9
    FuelType.BLACK_COAL: 26.55,  # 23.1-30.0
    FuelType.COKE: 31.75,  # 27.5-36.0
    FuelType.FIREWOOD: 14.1,  # dry wood, 15-20 % moisture: 13.6-14.6
}
_PLAUSIBLE_MJ_PER_KG = (9.0, 36.5)
_CALORIFIC = re.compile(_N + r"(?:\s*[-–]\s*" + _N + r")?\s*(kwh|mj|kcal)\s*/\s*kg", re.I)
_TO_MJ = {"kwh": 3.6, "mj": 1.0, "kcal": 3.6 / 860}

# --- firewood: volume -> mass (PDF, section 3.1) -----------------------------------------
# Biomac / Blaze Harmony table quoted in the report: 3.5 prms of hardwood weigh about
# 1180 kg, 5.5 prms of softwood about 1250 kg, both at 20 % moisture.
KG_PER_PRMS = {"hard": 337.0, "soft": 227.0}
PRMS_PER_PRMR = 1.6  # "most often 1.55 to 1.60 prms" for 25-33 cm logs
PRMS_PER_M3_SOLID = 1 / 0.45  # one loose metre holds about 0.45 m3 of solid wood
_HARDWOOD = re.compile(r"\bbuk|\bdub|\bhabr|\bjasan|\bakat|\bjavor|tvrd")
_SOFTWOOD = re.compile(r"\bsmrk|\bborov|\bjedl|\bmodrin|\bjehlic|mekk|\btopol|\bols|\bvrb|\blip")
_FRESH_WOOD = re.compile(r"cerstv|syrov|surov|kulatin|nastojato|samovyrob")
# Metre-long or longer pieces ("1 m", "2-4 m", "metrové", logs): the prmr -> prms factor
# of the report is for short split logs, so such prices are not converted.
_LONG_WOOD = re.compile(
    r"\b\d+(?:[.,]\d+)?\s*(?:-\s*\d+\s*)?m\b|\b[1-9]\d\d\s*cm\b"  # "1 m", "2-4 m", "100 cm"
    r"|metrov|\bklad(?:a|y|ach)?\b|\bkmen|kulatin"
)  # "klada/klady" are logs; "skladany" (stacked) must not match


def wood_class(name: str) -> str | None:
    """'hard', 'soft', or None when the species is not stated or mixed (e.g. birch, mix)."""
    folded = fold(name)
    hard, soft = bool(_HARDWOOD.search(folded)), bool(_SOFTWOOD.search(folded))
    if hard == soft:
        return None
    return "hard" if hard else "soft"


def stated_calorific_mj(params: dict[str, str]) -> float | None:
    for key, value in params.items():
        if not fold(key).startswith("vyhrevnost"):
            continue
        match = _CALORIFIC.search(value)
        if not match:
            continue
        low = _num(match.group(1))
        high = _num(match.group(2)) if match.group(2) else low
        mj = (low + high) / 2 * _TO_MJ[match.group(3).lower()]
        if _PLAUSIBLE_MJ_PER_KG[0] <= mj <= _PLAUSIBLE_MJ_PER_KG[1]:
            return round(mj, 2)
    return None


# --- 4. the record -----------------------------------------------------------------------

# Sanity bands for unit prices incl. VAT. Outside them the size or unit was most likely
# misread, so the unit price is dropped instead of being published.
# Coal dust (hruboprach) really sells at about 2 500-3 000 CZK/t, hence the low floor.
_PLAUSIBLE_CZK_PER_TONNE = (2_000, 40_000)
_PLAUSIBLE_CZK_PER_PRMS = (300, 6_000)


class SolidFuelPriceRecord(BaseModel):
    """One price of one seller at one point in time (PDF, section 4.3)."""

    # identification and time
    seller_name: str
    seller_ico: str | None = None
    source_id: str
    source_url: str
    scraped_at: str | None = Field(None, description="When the price was read (UTC, ISO 8601)")
    item_id: str
    group_id: str | None = Field(None, description="Shared by the variants of one product")

    # classification and quality
    fuel_category: FuelType
    product_name_raw: str
    category_raw: str = ""
    quality_standard: str | None = Field(None, description='ENplus A1, Rekord 4", SD Bílina')

    # raw price and package
    original_price: float = Field(..., description="Price exactly as published")
    price_includes_vat: bool = True
    original_price_vat: float = Field(..., description="Published price incl. 21 % VAT")
    original_unit: OriginalUnit | None = Field(
        None, description="What the price buys; None = a package of unknown size"
    )
    original_quantity: float = Field(1.0, description="How many `original_unit` the price buys")
    package_weight_kg: float | None = None

    # normalised metrics (computed here, never by a language model)
    normalized_price_per_kg_vat: float | None = None
    normalized_price_per_ton_vat: int | None = None
    normalized_price_per_prms_vat: int | None = Field(
        None, description="Firewood only: price per loose cubic metre"
    )
    calorific_value_mj_kg: float | None = None
    calorific_source: Literal["seller", "typical"] | None = None
    energy_price_per_kwh_vat: float | None = Field(
        None, description="Price of 1 kWh of energy in the fuel (boiler efficiency not applied)"
    )

    # logistics and availability
    delivery_included: bool | None = Field(None, description="None = not stated")
    delivery_fee_czk: float | None = None
    delivery_fee_note: str | None = None
    price_total_delivered_vat: float | None = Field(
        None, description="Price incl. delivery, when delivery is included or its fee is known"
    )
    target_psc_region: str | None = Field(None, description="Where the price applies")
    seller_region: str | None = Field(None, description="Region (kraj) of the seller")
    delivery_days: int | None = None
    in_stock: bool | None = None

    flags: list[str] = Field(default_factory=list)


@dataclass
class RawPrice:
    """What a source says about one price, before any arithmetic."""

    fuel: FuelType
    name: str
    price: float
    unit: OriginalUnit | None
    quantity: float = 1.0
    package_weight_kg: float | None = None
    price_includes_vat: bool = True
    m3_is_solid: bool = False
    """True when 'm3' means solid wood (plnometr), as on forestry price lists."""
    stated_mj_per_kg: float | None = None
    flags: list[str] = field(default_factory=list)


def _mass_kg(raw: RawPrice) -> float | None:
    if raw.unit == "kg":
        return raw.quantity
    if raw.unit == "q":
        return raw.quantity * 100
    if raw.unit == "t":
        return raw.quantity * 1000
    if raw.unit in ("bag", "pallet") and raw.package_weight_kg:
        return raw.quantity * raw.package_weight_kg
    return None


def _loose_volume_prms(raw: RawPrice) -> tuple[float | None, list[str]]:
    if raw.unit == "prms":
        return raw.quantity, []
    if raw.unit == "prmr":
        return raw.quantity * PRMS_PER_PRMR, ["volume_converted_prmr_to_prms"]
    if raw.unit == "m3":
        if raw.m3_is_solid:
            return raw.quantity * PRMS_PER_M3_SOLID, ["volume_converted_m3_to_prms"]
        return None, ["volume_stacking_unknown"]
    return None, []


def price_metrics(raw: RawPrice) -> dict:
    """Unit prices, energy content and flags for one raw price. The only place with maths."""
    flags = list(raw.flags)
    price_vat = raw.price if raw.price_includes_vat else round(raw.price * (1 + VAT_RATE), 2)
    if not raw.price_includes_vat:
        flags.append("vat_added")
    metrics: dict = {"original_price_vat": price_vat}

    mass = _mass_kg(raw)
    if raw.fuel is FuelType.FIREWOOD and mass is None:
        if raw.unit in ("prmr", "prms") and _LONG_WOOD.search(fold(raw.name)):
            return metrics | {"flags": [*flags, "long_wood_not_comparable"]}
        prms, volume_flags = _loose_volume_prms(raw)
        flags += volume_flags
        if prms is None:
            if raw.unit is None:
                flags.append("package_size_unknown")
            return metrics | {"flags": flags}
        per_prms = price_vat / prms
        if not _PLAUSIBLE_CZK_PER_PRMS[0] <= per_prms <= _PLAUSIBLE_CZK_PER_PRMS[1]:
            return metrics | {"flags": ["unit_price_implausible"]}
        metrics["normalized_price_per_prms_vat"] = round(per_prms)
        species = wood_class(raw.name)
        if species is None:
            flags.append("wood_species_unknown")
            return metrics | {"flags": flags}
        mass = prms * KG_PER_PRMS[species]
        flags.append("mass_estimated_from_volume")
        if _FRESH_WOOD.search(fold(raw.name)):
            flags.append("fresh_wood_no_energy_value")
            per_kg = price_vat / mass
            metrics["normalized_price_per_kg_vat"] = round(per_kg, 2)
            return metrics | {"flags": flags}

    if mass is None:
        flags.append("package_size_unknown" if raw.unit in (None, "bag", "pallet") else
                     "unit_not_by_weight")  # fmt: skip
        return metrics | {"flags": flags}

    per_kg = price_vat / mass
    if raw.fuel in WEIGHT_FUELS:
        if not _PLAUSIBLE_CZK_PER_TONNE[0] <= per_kg * 1000 <= _PLAUSIBLE_CZK_PER_TONNE[1]:
            return metrics | {"flags": ["unit_price_implausible"]}
        metrics["normalized_price_per_ton_vat"] = round(per_kg * 1000)
    metrics["normalized_price_per_kg_vat"] = round(per_kg, 2)

    mj = raw.stated_mj_per_kg
    metrics["calorific_source"] = "seller" if mj else "typical"
    mj = mj or TYPICAL_MJ_PER_KG[raw.fuel]
    metrics["calorific_value_mj_kg"] = mj
    metrics["energy_price_per_kwh_vat"] = round(per_kg / (mj / 3.6), 2)
    return metrics | {"flags": flags}


def _total_delivered(price_vat: float, included: bool | None, fee: float | None) -> float | None:
    if included:
        return price_vat
    # Feeds often carry 0 or 1 as a placeholder fee, so only a real amount counts.
    if fee is not None and fee > 1:
        return round(price_vat + fee, 2)
    return None


def _record(
    raw: RawPrice,
    source: Source,
    *,
    item_id: str,
    url: str,
    scraped_at: str | None,
    **extra,
) -> SolidFuelPriceRecord:
    metrics = price_metrics(raw)
    included = extra.pop("delivery_included", source.delivery_included)
    fee = extra.pop("delivery_fee_czk", None)
    return SolidFuelPriceRecord(
        seller_name=source.seller,
        seller_ico=source.ico,
        source_id=source.id,
        source_url=url,
        scraped_at=scraped_at,
        item_id=item_id,
        fuel_category=raw.fuel,
        product_name_raw=raw.name,
        original_price=raw.price,
        price_includes_vat=raw.price_includes_vat,
        original_unit=raw.unit,
        original_quantity=raw.quantity,
        package_weight_kg=raw.package_weight_kg,
        delivery_included=included,
        delivery_fee_czk=fee,
        price_total_delivered_vat=_total_delivered(metrics["original_price_vat"], included, fee),
        target_psc_region=source.price_region.value if source.price_region else None,
        seller_region=source.region.value if source.region else None,
        **metrics,
        **extra,
    )


def normalize(
    item: FeedItem, source: Source, scraped_at: str | None = None
) -> SolidFuelPriceRecord | None:
    """Record for a feed item or product page, or None when it is not a solid fuel."""
    fuel = classify(item.name, item.category)
    if fuel is None:
        return None

    flags: list[str] = []
    volume = firewood_volume(item) if fuel is FuelType.FIREWOOD else None
    weight = None if volume else package_weight_kg(item)
    stated = None if volume else _STATED_CZK_PER_KG.search(fold(item.name))
    if stated and 3 <= _num(stated.group(1)) <= 40:
        # A unit price in the name beats any guess: the offer may be several pallets.
        weight = round(item.price_vat_czk / _num(stated.group(1)), 1)
    if not volume and not weight and fuel is not FuelType.FIREWOOD and item.shipping_weight_kg:
        # Nothing stated: fall back to the weight the shop ships. For bagged fuel on a
        # pallet that is the package; firewood is sold by volume, so it is not used there.
        weight = item.shipping_weight_kg
        flags.append("package_size_from_shipping_weight")

    if volume:
        unit, quantity = volume[1], volume[0]
    elif weight:
        unit, quantity = ("pallet" if weight >= 300 else "bag"), 1.0
    else:
        unit, quantity = None, 1.0
    raw = RawPrice(
        fuel=fuel,
        name=item.name,
        price=item.price_vat_czk,
        unit=unit,
        quantity=quantity,
        package_weight_kg=weight,
        stated_mj_per_kg=stated_calorific_mj(item.params),
        flags=flags,
    )
    return _record(
        raw,
        source,
        item_id=item.item_id,
        url=item.url,
        scraped_at=scraped_at,
        group_id=item.group_id,
        category_raw=item.category,
        quality_standard=quality_standard(item.name),
        delivery_fee_czk=item.delivery_fee_czk,
        delivery_days=item.delivery_days,
        in_stock=item.in_stock,
    )


def normalize_extracted(
    raw: RawPrice,
    source: Source,
    *,
    item_id: str,
    group_id: str | None = None,
    url: str,
    scraped_at: str | None,
    quality: str | None,
    delivery_note: str | None,
    delivery_included: bool | None,
) -> SolidFuelPriceRecord:
    """Record for a verified price-list row (see ``pricelist.verify_rows``)."""
    return _record(
        raw,
        source,
        item_id=item_id,
        group_id=group_id,
        url=url,
        scraped_at=scraped_at,
        # A quoted grade is stored in its canonical form ("Severočeské Doly Bílina" ->
        # "SD Bílina") when the rules know it, otherwise as quoted.
        quality_standard=(quality and (quality_standard(quality) or quality))
        or quality_standard(raw.name),
        delivery_fee_note=delivery_note,
        delivery_included=(
            delivery_included if delivery_included is not None else source.delivery_included
        ),
    )
