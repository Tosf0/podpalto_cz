"""Normalisation rules (PDF, section 3), checked on patterns found in real seller data."""

from pathlib import Path

import pytest
from podpalto_tools.collect.heureka import FeedError, FeedItem, parse_feed
from podpalto_tools.collect.normalize import (
    RawPrice,
    classify,
    firewood_volume,
    normalize,
    package_weight_kg,
    price_metrics,
    quality_standard,
    stated_calorific_mj,
)
from podpalto_tools.collect.source_registry import Source
from podpalto_tools.schemas import FuelType

FEED = (Path(__file__).parent / "fixtures" / "heureka_feed.xml").read_bytes()
SHOP = Source(id="shop", seller="Shop", base_url="https://x.example", kind="heureka_feed",
              feed_path="/f.xml")  # fmt: skip


def item(name: str, price: float = 1000, category: str = "", **params: str) -> FeedItem:
    return FeedItem(
        item_id="1", name=name, url="https://x.example/p", price_vat_czk=price,
        category=category, params=params,
    )  # fmt: skip


def record(feed_item: FeedItem, source: Source = SHOP):
    return normalize(feed_item, source, "2026-11-17T10:00:00+00:00")


@pytest.mark.parametrize(
    ("name", "category", "expected"),
    [
        ("EN plus A1 975kg CZ smrkové pelety", "", FuelType.WOOD_PELLETS),
        ("Dřevěné brikety RUF BUK", "", FuelType.WOOD_BRIQUETTES),
        ("Uhelné brikety REKORD 7 - 10 kg balení", "", FuelType.COAL_BRIQUETTES),
        ("Brikety Rekord 2 - pytlované 25 kg", "Uhlí & Uhelné brikety", FuelType.COAL_BRIQUETTES),
        ("Dřevěné brikety válec", "Uhlí & Uhelné brikety", FuelType.WOOD_BRIQUETTES),
        ("Hnědé tříděné uhlí ořech 2", "", FuelType.BROWN_COAL),
        ("Bílinské uhlí kostka", "", FuelType.BROWN_COAL),
        ("Černé uhlí ořech 1 (800 kg)", "", FuelType.BLACK_COAL),
        ("Černý ekohrášek 4 Power", "", FuelType.BLACK_COAL),
        ("Kovářské uhlí 25 kg", "", FuelType.BLACK_COAL),
        ("Otopový koks ořech 1", "Uhlí", FuelType.COKE),
        ("Buk štípaný vyschlý 25-30cm", "Palivové a stavební dřevo", FuelType.FIREWOOD),
        ("Dřevo do krbu bříza 33 cm", "Palivové dřevo", FuelType.FIREWOOD),
        ("Střešní lať 40x60x4000 mm", "Palivové a stavební dřevo", None),
        ("Dárkový poukaz na nákup pelet a briket", "PELETY", None),
        ("Tříděná dřevní mulčovací štěpka", "Štěpka & Kompost", None),
        ("Dřevěné uhlí na grilování 10 kg", "Gril", None),
        ("Dřevěný podpalovač 32 ks", "Podpalovače a tuhá paliva", None),
        ("Čistič krbových skel 500 ml", "Příslušenství", None),
        # Appliances that mention a fuel are not fuel; fuel "for" an appliance is.
        ("Peletová kamna Dynamic 9 kW", "Kamna", None),
        ("Automatický kotel na pelety", "Kotle", None),
        ("Kouřovod pro peletová kamna koleno 90°", "Kouřovody", None),
        ("Hnědé uhlí ořech 2 pro automatické kotle", "", FuelType.BROWN_COAL),
        ("Dřevo do krbu bříza štípaná", "", FuelType.FIREWOOD),
        ("BENEKOV ND C17 ROŠT UHLÍ 1106202305", "", None),
        ("ATMOS ND HADICE PŘÍVODNÍ PELET D65mm", "", None),
        ("Hydraulický modul k peletovým kamnům HSP 6", "", None),
        ("Špalek na štípání průměr 30-35cm", "Palivové dřevo", None),
    ],
)  # fmt: skip
def test_classify(name, category, expected):
    assert classify(name, category) == expected


@pytest.mark.parametrize(
    ("name", "expected"),
    [
        ("Dřevěné pelety ENplus A1 - pytel 15 kg", "ENplus A1"),
        ("Pelety EN plus A1 DINplus 15 kg", "ENplus A1, DINplus"),
        ("Uhelné brikety REKORD 7 - 10 kg", 'Rekord 7"'),
        ("Bílinské uhlí ořech 2", "SD Bílina"),
        ("Brikety RUF buk", None),
    ],
)
def test_quality_standard(name, expected):
    assert quality_standard(name) == expected


@pytest.mark.parametrize(
    ("feed_item", "expected_kg"),
    [
        (item("Smrkové pelety EN plus A1 975 kg/paleta CZ"), 975),
        (item("Dubové brikety - NESTRO XXL | 960kg"), 960),
        # A variant repeats its size in the name; the pallet is the largest figure.
        (item("Brikety - fólie 10 kg velikost palety: paleta 960 kg (96 x balení 10 kg)"), 960),
        (item("Brikety - fólie 10 kg velikost palety: balení 10 kg"), 10),
        (item("Hnědé uhlí - pytel 25 kg velikost palety: paleta 1000 kg (40x pytel 25 kg)"), 1000),
        # The name wins: the parameter lists the sizes of all variants.
        (item("PELETY Množství na paletě: 66ks (990kg)", **{"Hmotnost palety": "990 kg, 1050 kg"}),
         990),
        # No size in the name: fall back to parameters.
        (item("Pelety ENplus A1 sáček", **{"Balení": "70 ks po 15 kg"}), 1050),
        (item("BRIKETY – VÁLCE", **{"Hmotnost palety": "1000 kg", "Hmotnost balení": "10 kg"}),
         1000),
        (item("Brikety Piny Kay", **{"Balení v 10kg PE folích - na paletě": "96ks"}), 960),
        # Density and heating-value parameters must not be read as a package weight.
        (item("Pelety Big Bag", **{"Objemová hmotnost": "> 650 kg/rm", "Výhřevnost": "2 kg = 1 l"}),
         None),
        (item("Pelety volně ložené 6mm"), None),
    ],
)  # fmt: skip
def test_package_weight(feed_item, expected_kg):
    assert package_weight_kg(feed_item) == expected_kg


@pytest.mark.parametrize(
    ("name", "expected"),
    [
        ("Palivové dřevo tvrdé objem dřeva: sypaný 1 m3", (1.0, "prms")),
        ("Palivové dřevo tvrdé objem dřeva: klec 1,2 m3", (1.2, "m3")),
        ("Buk štípaný v kleci skládaný 1x1x2m (2 PRMR)", (2.0, "prmr")),
        ("Smrk štípaný 3 prm", (3.0, "prmr")),  # PRM is the stacked metre (PDF 3.1)
        ("Buk štípaný 2 sprm", (2.0, "prms")),
        ("Palivové dřevo - bigbag 1m3", (1.0, "m3")),
        ("Buková kulatina", None),
    ],
)
def test_firewood_volume(name, expected):
    assert firewood_volume(item(name)) == expected


@pytest.mark.parametrize(
    ("stated", "expected_mj"),
    [
        ("4,6 kWh/kg", 16.56),
        ("≥ 17,3 MJ / Kg", 17.3),
        ("17 - 19 Mj/kg", 18.0),
        ("4323-5008 kcal/kg", 19.53),
        ("18,5 - .31 kWh/Kg", None),  # garbage in the feed: the typical value is used
    ],
)
def test_stated_calorific_value(stated, expected_mj):
    assert stated_calorific_mj({"Výhřevnost": stated}) == expected_mj


def test_normalize_fills_the_pdf_contract():
    offer = record(item("Pelety A1 paleta 1050 kg", 13650, **{"Výhřevnost": "17,3 MJ/kg"}))
    assert (offer.seller_name, offer.source_id, offer.scraped_at) == (
        "Shop", "shop", "2026-11-17T10:00:00+00:00",
    )  # fmt: skip
    assert (offer.fuel_category, offer.original_unit, offer.package_weight_kg) == (
        FuelType.WOOD_PELLETS, "pallet", 1050,
    )  # fmt: skip
    assert (offer.original_price, offer.original_price_vat) == (13650, 13650)
    assert (offer.normalized_price_per_ton_vat, offer.normalized_price_per_kg_vat) == (13000, 13.0)
    # 13 CZK/kg / (17.3 MJ/kg / 3.6) = 2.71 CZK/kWh
    assert (offer.calorific_value_mj_kg, offer.calorific_source) == (17.3, "seller")
    assert offer.energy_price_per_kwh_vat == 2.71
    assert offer.flags == []


def test_typical_heating_values_come_from_the_report_table():
    offer = record(item("Hnědé uhlí ořech 2 paleta 1000 kg", 9000))
    assert (offer.calorific_value_mj_kg, offer.calorific_source) == (18.0, "typical")
    assert offer.energy_price_per_kwh_vat == 1.8  # 9 CZK/kg / 5 kWh/kg


def test_normalize_keeps_price_but_no_unit_price_when_size_is_unknown():
    offer = record(item("Pelety Big Bag", 14890))
    assert (offer.original_price_vat, offer.original_unit) == (14890, None)
    assert offer.normalized_price_per_ton_vat is None and offer.energy_price_per_kwh_vat is None
    assert offer.flags == ["package_size_unknown"]


def test_normalize_drops_implausible_unit_price():
    # The name says 10 kg but the price is for a pallet: 999 CZK/kg cannot be right.
    offer = record(item("Dřevěné brikety RUF 10 kg", 9990))
    assert offer.normalized_price_per_ton_vat is None and offer.energy_price_per_kwh_vat is None
    assert offer.flags == ["unit_price_implausible"]


def test_shipping_weight_is_a_flagged_fallback_for_the_package_size():
    bagged = FeedItem("1", "Brikety RUF premium", "u", 9024, shipping_weight_kg=960)
    offer = record(bagged)
    assert (offer.package_weight_kg, offer.normalized_price_per_ton_vat) == (960, 9400)
    assert offer.flags == ["package_size_from_shipping_weight"]

    stated = FeedItem("1", "Brikety RUF paleta 840 kg", "u", 9024, shipping_weight_kg=960)
    offer = record(stated)
    assert (offer.package_weight_kg, offer.flags) == (840, [])  # what the seller states wins

    wood = FeedItem("1", "Palivové dřevo dub", "u", 14400, shipping_weight_kg=3490)
    assert record(wood).flags == ["package_size_unknown"]


def test_unit_price_stated_in_the_name_sets_the_package_size():
    # Two pallets sold as one offer: only the stated 12,90 Kč/kg tells.
    bundle = item("PELETY EN PLUS A1 s dopravou do 30 km - 12,90 Kč/kg", 27090, Hmotnost="1050 kg")
    offer = record(bundle)
    assert (offer.package_weight_kg, offer.normalized_price_per_ton_vat) == (2100, 12900)
    assert offer.quality_standard == "ENplus A1"
    bag = record(item("PELETY EN PLUS A1 vlastní odběr - 12,50 Kč/kg", 188))
    assert (bag.original_unit, bag.normalized_price_per_ton_vat) == ("bag", 12533)


def test_firewood_volume_is_converted_to_loose_metres_and_mass():
    # PDF 3.1: 1 prmr = 1.6 prms; hardwood 337 kg per prms at 20 % moisture.
    offer = record(item("Buk štípaný v kleci skládaný 1x1x2m (2 PRMR)", 9990))
    assert (offer.original_unit, offer.original_quantity) == ("prmr", 2.0)
    assert offer.normalized_price_per_prms_vat == 3122  # 9990 / 3.2
    assert offer.normalized_price_per_kg_vat == 9.26  # 9990 / (3.2 * 337)
    assert (offer.calorific_value_mj_kg, offer.energy_price_per_kwh_vat) == (14.1, 2.37)
    assert offer.flags == ["volume_converted_prmr_to_prms", "mass_estimated_from_volume"]

    soft = record(item("Palivové dřevo měkké sypané 2 prms", 2400))
    assert (soft.normalized_price_per_prms_vat, soft.normalized_price_per_kg_vat) == (1200, 5.29)
    assert soft.energy_price_per_kwh_vat == 1.35


def test_firewood_without_species_or_stacking_keeps_what_it_can():
    birch = record(item("Bříza sypaná 1 prms", 1500, category="Palivové dřevo"))
    assert (birch.normalized_price_per_prms_vat, birch.normalized_price_per_kg_vat) == (1500, None)
    assert birch.flags == ["wood_species_unknown"]

    crate = record(item("Palivové dřevo tvrdé objem dřeva: klec 1,2 m3", 2760))
    assert crate.normalized_price_per_prms_vat is None
    assert crate.flags == ["volume_stacking_unknown"]

    fresh = record(item("Smrk čerstvý štípaný sypaný 1 prms", 1200))
    assert (fresh.normalized_price_per_prms_vat, fresh.normalized_price_per_kg_vat) == (1200, 5.29)
    assert fresh.energy_price_per_kwh_vat is None
    assert "fresh_wood_no_energy_value" in fresh.flags


def test_price_list_units_and_vat():
    # A coal yard's price without VAT per metric quintal (q = 100 kg).
    metrics = price_metrics(
        RawPrice(fuel=FuelType.BROWN_COAL, name="Ořech 2", price=650, unit="q",
                 price_includes_vat=False)
    )  # fmt: skip
    assert metrics["original_price_vat"] == 786.5
    assert metrics["normalized_price_per_ton_vat"] == 7865
    assert metrics["flags"] == ["vat_added"]

    # Forestry 'm3' is solid wood: one m3 is about 2.22 loose metres.
    solid = price_metrics(
        RawPrice(fuel=FuelType.FIREWOOD, name="Smrk palivo VI. třída", price=1300, unit="m3",
                 m3_is_solid=True)
    )  # fmt: skip
    assert solid["normalized_price_per_prms_vat"] == 585
    assert solid["flags"] == ["volume_converted_m3_to_prms", "mass_estimated_from_volume"]

    wrong_unit = price_metrics(RawPrice(fuel=FuelType.WOOD_PELLETS, name="Pelety", price=900,
                                        unit="prms"))  # fmt: skip
    assert wrong_unit["flags"] == ["unit_not_by_weight"]


def test_delivery_and_region_come_from_the_registry_and_the_feed():
    nationwide = Source.model_validate(
        SHOP.model_dump() | {"delivery_included": True, "price_region": "CZ",
                             "region": "Kraj Vysočina", "ico": "12345678"}
    )  # fmt: skip
    offer = record(item("Pelety paleta 1050 kg", 13650), nationwide)
    assert (offer.delivery_included, offer.price_total_delivered_vat) == (True, 13650)
    assert (offer.target_psc_region, offer.seller_region, offer.seller_ico) == (
        "CZ", "Kraj Vysočina", "12345678",
    )  # fmt: skip

    with_fee = FeedItem("1", "Pelety paleta 1050 kg", "u", 13650, delivery_fee_czk=990)
    assert record(with_fee).price_total_delivered_vat == 14640
    placeholder = FeedItem("1", "Pelety paleta 1050 kg", "u", 13650, delivery_fee_czk=0)
    assert record(placeholder).price_total_delivered_vat is None


def test_normalize_skips_non_fuel():
    assert record(item("Dárkový poukaz 2 000 Kč")) is None


def test_parse_feed_reads_items_and_skips_incomplete_ones():
    items, skipped = parse_feed(FEED)
    assert (len(items), skipped) == (17, 1)
    ruf = next(i for i in items if i.item_id == "201")
    assert ruf.price_vat_czk == 10080
    assert ruf.delivery_days == 0
    assert ruf.delivery_fee_czk == 990  # lowest of the two DELIVERY entries
    assert ruf.params["Balení"] == "84 ks po 10 kg"
    bulk = next(i for i in items if i.item_id == "103")
    assert bulk.delivery_days is None and bulk.delivery_fee_czk is None


@pytest.mark.parametrize(
    "content",
    [b"<html><body>403 Forbidden</body></html>", b"not xml at all", b"<SHOP><SHOPITEM>"],
)
def test_parse_feed_rejects_non_feeds(content):
    with pytest.raises(FeedError):
        parse_feed(content)


def test_parse_feed_rejects_entity_expansion():
    bomb = b'<?xml version="1.0"?><!DOCTYPE s [<!ENTITY a "aaaa">]><SHOP>&a;</SHOP>'
    with pytest.raises(FeedError):
        parse_feed(bomb)
