"""Export for the web app (spec section 10): conversions, attributes, skipped rows, runs."""

import pytest
from fastapi.testclient import TestClient
from podpalto_tools.api import create_app
from podpalto_tools.collect.export import (
    build_export,
    coal_attributes,
    delivery_included,
    display_name,
    pellet_attributes,
    variant_of,
    wood_attributes,
)
from podpalto_tools.collect.locate import LocatedSeller
from podpalto_tools.collect.normalize import SolidFuelPriceRecord
from podpalto_tools.collect.source_registry import Source
from podpalto_tools.collect.store import Store
from podpalto_tools.schemas import FuelType

SOURCE = Source.model_validate({
    "id": "demosklad", "seller": "demosklad.example", "base_url": "https://demosklad.example",
    "kind": "static_html", "page_paths": ["/cenik/"], "region": "Kraj Vysočina",
    "price_region": "Kraj Vysočina",
})  # fmt: skip
LOCATED = LocatedSeller.model_validate({
    "seller_key": "demosklad", "source_id": "demosklad", "checked_at": "2026-11-18T10:00:00+00:00",
    "address": {"street": "Ústrašín 65", "city": "Ústrašín", "zip": "393 01", "region": "VYS",
                "ruian_address_code": 20113498},
    "location": {"lat": 49.381439, "lng": 15.168108, "source": "ruian",
                 "precision": "address_point"},
    "registry": {"status": "verified", "ico": "19240538", "name": "Demo Uhlí s.r.o."},
    "flags": ["location_is_registered_office"],
})  # fmt: skip
T1, T2 = "2026-11-17T08:00:00+00:00", "2026-11-18T08:00:00+00:00"


def record(name, price, unit, fuel, item, **extra) -> SolidFuelPriceRecord:
    return SolidFuelPriceRecord(
        seller_name="DemoSklad", source_id="demosklad", source_url="https://demosklad.example/cenik/",
        scraped_at=extra.pop("scraped_at", T2), item_id=item, fuel_category=fuel,
        product_name_raw=name, original_price=price, original_price_vat=price, original_unit=unit,
        **extra,
    )  # fmt: skip


ROWS = [
    record(
        "Hnědé uhlí Bílina Ořech 2",
        690,
        "q",
        FuelType.BROWN_COAL,
        "/cenik/#orech-2-q",
        quality_standard="SD Bílina",
    ),  # fmt: skip
    record("Buk štípaný 33 cm suchý", 1900, "prms", FuelType.FIREWOOD, "/cenik/#buk-33-prms"),
    record(
        "Pelety A1 pytel 15 kg",
        225,
        "bag",
        FuelType.WOOD_PELLETS,
        "/cenik/#pelety-bag",
        package_weight_kg=15,
        flags=["vat_assumed_from_registry"],
    ),  # fmt: skip
    record(
        "Palivové dřevo klec 1,2 m3",
        2028,
        "m3",
        FuelType.FIREWOOD,
        "/cenik/#klec",
        flags=["volume_stacking_unknown"],
    ),  # fmt: skip
    record(
        "Pelety Big Bag",
        14890,
        None,
        FuelType.WOOD_PELLETS,
        "/cenik/#bigbag",
        flags=["package_size_unknown"],
    ),  # fmt: skip
]


@pytest.fixture
def store(data_dir):
    store = Store(data_dir / "prices.sqlite")
    store.add_snapshot(source_id="demosklad", fetched_at=T1, status="ok", records=ROWS[:1])
    store.add_snapshot(source_id="demosklad", fetched_at=T2, status="ok", records=ROWS)
    return store


def test_units_are_converted_and_unshowable_rows_listed(store):
    payload = build_export(store, [SOURCE], {"demosklad": LOCATED})
    prices = {p.product_key.split("#")[1]: p for p in payload.price_observations}
    assert {k: (p.price_czk, p.original_unit) for k, p in prices.items()} == {
        "orech-2-q": (6900, "q"),  # 690 CZK/q -> per tonne
        "buk-33-prms": (1900, "prms"),
        "pelety-bag": (225, "bag"),
    }
    units = {p.item_id.split("#")[1]: (p.category, p.unit, p.package_kg) for p in payload.products}
    assert units == {
        "orech-2-q": ("coal", "t", None),
        "buk-33-prms": ("wood", "PRMS", None),
        "pelety-bag": ("pellets", "pytel", 15),
    }
    assert sorted((s.item_id, s.reason) for s in payload.skipped) == [
        ("/cenik/#bigbag", "package_size_unknown"),
        ("/cenik/#klec", "volume_stacking_unknown"),
    ]
    assert prices["pelety-bag"].vat_status == "assumed"
    assert prices["orech-2-q"].valid_in_regions == ["VYS"]


def test_only_the_newest_snapshot_and_its_run(store):
    payload = build_export(store, [SOURCE], {"demosklad": LOCATED})
    (run,) = payload.runs
    assert (run.snapshot_id, run.exported_count, run.skipped_count) == (2, 3, 2)
    assert {p.snapshot_id for p in payload.price_observations} == {2}


def test_since_keeps_only_the_snapshots_of_this_collection(store):
    store.add_snapshot(source_id="demosklad", fetched_at="2026-11-19T08:00:00+00:00",
                       status="error", error="HTTP 503")  # fmt: skip
    later = build_export(store, [SOURCE], {"demosklad": LOCATED}, since="2026-11-19T00:00:00Z")
    assert [(r.status, r.error) for r in later.runs] == [("error", "HTTP 503")]
    assert later.products == [] and later.sellers == []


def test_seller_comes_from_the_committed_location(store):
    payload = build_export(store, [SOURCE], {"demosklad": LOCATED})
    (seller,) = payload.sellers
    assert (seller.seller_key, seller.name, seller.company_ico) == (
        "demosklad",
        "Demo Uhlí",
        "19240538",
    )
    assert seller.address["region"] == "VYS" and seller.flags == ["location_is_registered_office"]
    unlocated = build_export(store, [SOURCE], {})
    assert unlocated.sellers == [] and unlocated.products == []
    assert [s.reason for s in unlocated.skipped] == ["seller_not_located"]


def test_display_name_prefers_the_registry_then_ares_without_legal_form():
    assert display_name(SOURCE, "Městské lesy Liberec, p. o.") == "Městské lesy Liberec"
    assert display_name(SOURCE, "K & B spol. s r.o.") == "K & B"
    assert display_name(SOURCE, None) == "demosklad.example"
    named = SOURCE.model_copy(update={"name": "Uhelné sklady Demo"})
    assert display_name(named, "MADOS PE s.r.o.") == "Uhelné sklady Demo"


@pytest.mark.parametrize(
    ("name", "unit", "expected"),
    [
        ("Buk štípaný 33 cm suchý", "PRMS",
         {"wood_species": ["buk"], "wood_group": "hard", "wood_form": "sypane",
          "log_length_cm": 33, "log_length_cm_exact": 33.0, "moisture": "dry"}),
        ("Jehličnaté – 1 m", "PRM",
         {"wood_species": ["mix-mekke"], "wood_group": "soft", "wood_form": "metrovky",
          "log_length_cm": 100}),
        ("Tvrdé listnaté 30-35 cm, vlhkost do 20 %", "PRM",
         {"wood_species": ["mix-tvrde"], "wood_form": "rovnane", "log_length_cm": 33,
          "log_length_cm_exact": None, "moisture": "semi", "moisture_percent": 20.0}),
        ("Olše štípaná 25 cm", "PRMS", {"wood_species": ["mix-mekke"], "wood_species_raw": "olse"}),
        ("Buk + smrk mix", "PRMS", {"wood_species": ["buk", "smrk"], "wood_group": None}),
    ],
)  # fmt: skip
def test_wood_attributes_from_the_name(name, unit, expected):
    attributes, _ = wood_attributes(name, unit)
    assert {key: attributes[key] for key in expected} == expected


def test_pellet_certification_only_when_enplus_is_named():
    assert pellet_attributes("Pelety ENplus A1 6 mm", None)[0]["certification"] == "ENplus A1"
    attributes, flags = pellet_attributes("PELETY Premium A1", "Premium A1")
    assert (attributes["certification"], flags) == ("bez certifikace", ["certification_unverified"])


@pytest.mark.parametrize(
    ("name", "fuel", "coal_type"),
    [
        ("Hnědé uhlí Bílina Ořech 2", FuelType.BROWN_COAL, "hnědé ořech 2"),
        ("OŘECH 1 – paletový prodej", FuelType.BROWN_COAL, "hnědé ořech 1"),
        ("Kostka Bílina", FuelType.BROWN_COAL, "hnědé kostka"),
        ("Černé uhlí ořech 1", FuelType.BLACK_COAL, "černé ořech"),
        ("Koks 20–40 mm", FuelType.COKE, "koks"),
        ("Hruboprach", FuelType.BROWN_COAL, None),
    ],
)
def test_coal_type_from_the_name(name, fuel, coal_type):
    assert coal_attributes(name, fuel, None)["coal_type"] == coal_type


def test_coal_origin_and_grain():
    attributes = coal_attributes("Koks 20–40 mm", FuelType.COKE, None)
    assert attributes["grain_mm"] == "20–40 mm"
    assert (
        coal_attributes("Ořech 2", FuelType.BROWN_COAL, "SD Bílina")["coal_origin"] == "SD Bílina"
    )


def test_export_endpoint(collected):
    api = TestClient(create_app())
    payload = api.get("/export").json()
    assert payload["schema_version"] == "1.0" and len(payload["runs"]) == 1
    # The fixture shop is not in the committed locations: no seller, the reason is listed.
    assert payload["sellers"] == [] and payload["skipped"][0]["reason"] == "seller_not_located"
    assert api.get("/export?since=yesterday").status_code == 422


@pytest.mark.parametrize(
    ("name", "unit", "kind", "tier"),
    [
        ("OŘECH 1 - BÍLINA – cena do 15q", "t", "regular", None),
        ("OŘECH 1 - BÍLINA – cena nad 15q", "t", "tier", {"min_quantity": 1.5, "unit": "t"}),
        ("DŘEVĚNÉ EKOBRIKETY – Při odběru 1t a více", "t", "tier",
         {"min_quantity": 1.0, "unit": "t"}),
        ("jehličnaté – PŘI ODBĚRU 10 A VÍCE PRM JSOU PLATNÉ NÍŽE UVEDENÉ BONUSOVÉ CENY!!!", "PRM",
         "tier", {"min_quantity": 10.0, "unit": "PRM"}),
        ("OŘECH 1 – paletový prodej", "pytel", "tier", {"min_quantity": 1, "unit": "paleta"}),
        ("OŘECH 1 – kusový prodej", "pytel", "regular", None),
        ("jehličnaté – VĚRNOSTNÍ SLEVA - PRO ZÁKAZNÍKY, KTEŘÍ V ROCE 2025 ODEBRALI 10 PRM",
         "PRM", "promo", None),
        ("Hruboprach – II. Cenové pásmo", "t", "zone", None),
        ("Buk – prms", "PRMS", "regular", None),
        ("Palivové dřevo – cca 1 PRM; tvrdé listnaté (mix)", "PRM", "regular", None),
    ],
)  # fmt: skip
def test_variant_from_the_row_name(name, unit, kind, tier):
    variant = variant_of(name, unit)
    assert (variant.kind, variant.tier) == (kind, tier)


ZONE_ROWS = [
    record("Kotlová směs – 0. Cenové pásmo", 629, "q", FuelType.BROWN_COAL, "/#ks-0"),
    record("Kotlová směs – I. Cenové pásmo", 629, "q", FuelType.BROWN_COAL, "/#ks-i"),
    record("Kotlová směs – II. Cenové pásmo", 639, "q", FuelType.BROWN_COAL, "/#ks-ii"),
    record("Ořech 2 – cena do 15q", 679, "q", FuelType.BROWN_COAL, "/#o2-do-15"),
    record("Ořech 2 – cena nad 15q", 665, "q", FuelType.BROWN_COAL, "/#o2-nad-15"),
    record("Ořech 2 – Věrnostní sleva", 600, "q", FuelType.BROWN_COAL, "/#o2-sleva"),
]


def test_zones_merge_into_one_from_price_and_tiers_link_to_their_base(data_dir):
    store = Store(data_dir / "prices.sqlite")
    store.add_snapshot(source_id="demosklad", fetched_at=T2, status="ok", records=ZONE_ROWS)
    payload = build_export(store, [SOURCE], {"demosklad": LOCATED})
    products = {p.item_id: p for p in payload.products}
    prices = {p.product_key.split(":", 1)[1]: p for p in payload.price_observations}
    assert set(products) == {"/#ks-0", "/#o2-do-15", "/#o2-nad-15", "/#o2-sleva"}
    assert products["/#ks-0"].name == "Kotlová směs" and "price_from" in prices["/#ks-0"].flags
    assert sorted(s.item_id for s in payload.skipped if s.reason == "price_zone_variant") == [
        "/#ks-i", "/#ks-ii"]  # fmt: skip
    tier, promo = products["/#o2-nad-15"], products["/#o2-sleva"]
    assert tier.price_tier == {"min_quantity": 1.5, "unit": "t"} and not tier.is_promo
    assert tier.base_product_key == promo.base_product_key == "demosklad:/#o2-do-15"
    assert promo.is_promo and promo.price_tier is None
    assert payload.runs[0].exported_count == 4 and payload.runs[0].skipped_count == 2


def test_a_source_with_export_false_is_collected_but_not_sent(store):
    hidden = SOURCE.model_copy(update={"export": False})
    payload = build_export(store, [hidden], {"demosklad": LOCATED})
    assert payload.sellers == [] and payload.products == [] and payload.runs == []
    assert [(s.source_id, s.reason) for s in payload.skipped] == [("demosklad", "export_disabled")]


def test_each_installation_exports_its_own_snapshot_id_range(store, monkeypatch):
    # Supabase identifies an exported snapshot by (source, id): Railway's fresh database
    # starts at 1 again, so its ids are shifted (EXPORT_SNAPSHOT_OFFSET).
    monkeypatch.setenv("EXPORT_SNAPSHOT_OFFSET", "1000000")
    payload = build_export(store, [SOURCE], {"demosklad": LOCATED})
    assert [run.snapshot_id for run in payload.runs] == [1000002]
    assert {price.snapshot_id for price in payload.price_observations} == {1000002}


def test_promotions_and_tiers_are_not_compared_with_the_market(data_dir):
    store = Store(data_dir / "prices.sqlite")
    rows = [
        record("jehličnaté – 1 m", 1270, "prmr", FuelType.FIREWOOD, "/#j-1m"),
        record("jehličnaté – PŘI ODBĚRU 10 A VÍCE PRM", 1210, "prmr", FuelType.FIREWOOD,
               "/#j-10", flags=["outlier_vs_market"]),
        record("jehličnaté – VĚRNOSTNÍ SLEVA", 1076, "prmr", FuelType.FIREWOOD, "/#j-sleva",
               flags=["outlier_vs_market", "price_jump"]),
        record("Mix dřevin – 1 m", 532, "prmr", FuelType.FIREWOOD, "/#mix",
               flags=["outlier_vs_market"]),
    ]  # fmt: skip
    store.add_snapshot(source_id="demosklad", fetched_at=T2, status="ok", records=rows)
    payload = build_export(store, [SOURCE], {"demosklad": LOCATED})
    flags = {p.product_key.split("#")[1]: p.flags for p in payload.price_observations}
    assert flags["j-10"] == [] and flags["j-sleva"] == []
    assert flags["mix"] == ["outlier_vs_market"]  # a regular product keeps it


@pytest.mark.parametrize(
    ("name", "stated", "expected"),
    [
        ("Pelety ENplus A1 975 kg s dopravou do 30 km", None, True),
        ("podestýlkové pelety 10 l VČETNĚ DOPRAVY", None, True),
        ("Černé uhlí kostka - paleta 800 kg + doprava zdarma", None, True),
        ("Pelety ENplus A1 975 kg", None, None),
        ("Pelety s dopravou", False, False),  # what the collection knows wins
    ],
)
def test_delivery_included_from_the_offer_name(name, stated, expected):
    row = record(name, 1000, "bag", FuelType.WOOD_PELLETS, "/#x", package_weight_kg=15,
                 delivery_included=stated)  # fmt: skip
    assert delivery_included(row) is expected
