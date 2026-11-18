"""Export for the web app (spec section 10): conversions, attributes, skipped rows, runs."""

import pytest
from fastapi.testclient import TestClient
from podpalto_tools.api import create_app
from podpalto_tools.collect.export import (
    build_export,
    coal_attributes,
    display_name,
    pellet_attributes,
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
