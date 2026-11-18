"""Writing the tools export to Supabase: order, idempotency, owned sellers, deactivation.

Supabase is replaced by an in-memory table store that understands the few PostgREST
filters the export uses (``in.(…)``, ``eq.``, ``is.``, ``limit``, ``offset``).
"""

from __future__ import annotations

import copy
import itertools
import re
import urllib.parse
from typing import Any

from podpalto_app.worker.export import write_export
from podpalto_app.worker.link_sellers import domain, link, match_sellers

_ids = itertools.count(1)


def _matches(row: dict[str, Any], filters: dict[str, str]) -> bool:
    for column, condition in filters.items():
        op, _, value = condition.partition(".")
        if op == "in":
            values = re.findall(r'"((?:[^"\\]|\\.)*)"', value)
            if str(row.get(column)) not in values:
                return False
        elif op == "eq" and str(row.get(column)) != value:
            return False
        elif (
            op == "is"
            and row.get(column) is not {"true": True, "false": False, "null": None}[value]
        ):
            return False
    return True


class MemoryDb:
    def __init__(self, tables: dict[str, list[dict[str, Any]]] | None = None) -> None:
        self.tables: dict[str, list[dict[str, Any]]] = {
            "sellers": [], "products": [], "price_observations": [], "scrape_runs": [],
        }  # fmt: skip
        self.tables.update(copy.deepcopy(tables or {}))
        self.writes: list[str] = []

    @staticmethod
    def _parse(query: str) -> tuple[list[str] | None, dict[str, str], int, int | None]:
        select, filters, offset, limit = None, {}, 0, None
        for key, value in urllib.parse.parse_qsl(query):
            if key == "select":
                select = value.split(",")
            elif key == "offset":
                offset = int(value)
            elif key == "limit":
                limit = int(value)
            elif key != "order":
                filters[key] = value
        return select, filters, offset, limit

    def select(self, table: str, query: str) -> list[dict[str, Any]]:
        select, filters, offset, limit = self._parse(query)
        rows = [r for r in self.tables[table] if _matches(r, filters)][offset:]
        rows = rows[:limit] if limit else rows
        return [{k: r.get(k) for k in select} if select else dict(r) for r in rows]

    def insert(self, table: str, rows: Any, *, on_conflict: str | None = None) -> list[Any]:
        self.writes.append(table)
        out = []
        for row in rows if isinstance(rows, list) else [rows]:
            existing = None
            if on_conflict:
                cols = on_conflict.split(",")
                existing = next((r for r in self.tables[table]
                                 if all(r.get(c) == row.get(c) for c in cols)), None)  # fmt: skip
            if existing is not None:
                existing.update(row)
                out.append(dict(existing))
            else:
                new = {"id": f"{table}-{next(_ids)}", **row}
                self.tables[table].append(new)
                out.append(dict(new))
        return out

    def update(self, table: str, match: dict[str, Any], values: dict[str, Any]) -> None:
        self.writes.append(table)
        for row in self.tables[table]:
            if all(row.get(k) == v for k, v in match.items()):
                row.update(values)

    def update_where(self, table: str, query: str, values: dict[str, Any]) -> list[Any]:
        self.writes.append(table)
        _, filters, _, _ = self._parse(query)
        hit = [r for r in self.tables[table] if _matches(r, filters)]
        for row in hit:
            row.update(values)
        return hit


SELLER = {
    "seller_key": "demosklad", "source_ids": ["demosklad"], "name": "Demo Uhlí",
    "company_ico": "19240538", "legal_name": "Demo Uhlí s.r.o.", "website": "https://demosklad.example",
    "address": {"street": "Ústrašín 65", "city": "Ústrašín", "zip": "393 01", "region": "VYS",
                "ruian_address_code": 20113498},
    "location": {"lat": 49.38, "lng": 15.17, "source": "ruian", "precision": "address_point",
                 "checked_at": "2026-11-18T10:00:00+00:00"},
    "registry": {"status": "verified"}, "flags": [],
}  # fmt: skip


def product(item: str, **extra: Any) -> dict[str, Any]:
    return {"product_key": f"demosklad:{item}", "seller_key": "demosklad", "item_id": item,
            "name": item, "name_raw": item, "category": "coal", "unit": "t",
            "source_url": "https://demosklad.example/cenik/", "active": True, "flags": [],
            **extra}  # fmt: skip


def price(item: str, czk: float, snapshot: int = 7) -> dict[str, Any]:
    return {"product_key": f"demosklad:{item}", "price_czk": czk,
            "observed_at": "2026-11-18T08:00:00+00:00", "vat_status": "included",
            "source_url": "https://demosklad.example/cenik/", "original_price": czk / 10,
            "original_unit": "q", "original_quantity": 1, "original_price_includes_vat": True,
            "normalized": {}, "snapshot_id": snapshot, "flags": []}  # fmt: skip


def payload(snapshot: int = 7, items: dict[str, float] | None = None) -> dict[str, Any]:
    items = items or {"/cenik/#orech-2-q": 6900, "/cenik/#koks-q": 10000}
    return {
        "runs": [{"snapshot_id": snapshot, "source_id": "demosklad", "seller_key": "demosklad",
                  "status": "ok", "fetched_at": "2026-11-18T08:00:00+00:00", "item_count": 2,
                  "exported_count": len(items), "skipped_count": 0}],
        "sellers": [SELLER],
        "products": [product(item) for item in items],
        "price_observations": [price(item, czk, snapshot) for item, czk in items.items()],
        "skipped": [],
    }  # fmt: skip


def test_first_export_creates_seller_products_prices_and_run_in_order() -> None:
    db = MemoryDb()
    counts = write_export(payload(), db, job_run_id="job-1")  # type: ignore[arg-type]
    assert (
        counts["sellers_new"],
        counts["products_new"],
        counts["observations"],
        counts["runs"],
    ) == (1, 2, 2, 1)
    (seller,) = db.tables["sellers"]
    assert (seller["external_key"], seller["slug"], seller["region"], seller["lat"]) == (
        "demosklad", "demosklad", "VYS", 49.38)  # fmt: skip
    first = db.tables["products"][0]
    assert (first["external_id"], first["price_czk"], first["price_updated_at"]) == (
        "/cenik/#orech-2-q", 6900, "2026-11-18T08:00:00+00:00")  # fmt: skip
    assert db.tables["scrape_runs"][0]["job_run_id"] == "job-1"
    order = [t for t, _ in itertools.groupby(db.writes)]
    assert order == ["sellers", "products", "price_observations", "scrape_runs"]


def test_the_same_snapshot_twice_adds_no_prices() -> None:
    db = MemoryDb()
    write_export(payload(), db)  # type: ignore[arg-type]
    again = write_export(payload(), db)  # type: ignore[arg-type]
    assert (again["runs_already_exported"], again["observations"], again["runs"]) == (1, 0, 0)
    assert len(db.tables["price_observations"]) == 2 and len(db.tables["products"]) == 2


def test_next_snapshot_keeps_the_current_price_and_deactivates_what_is_gone() -> None:
    db = MemoryDb()
    write_export(payload(), db)  # type: ignore[arg-type]
    db.tables["sellers"][0]["name"] = "Upraveno na webu"
    counts = write_export(payload(8, {"/cenik/#orech-2-q": 7200}), db)  # type: ignore[arg-type]
    assert (counts["sellers_updated"], counts["products_updated"], counts["observations"]) == (
        1,
        1,
        1,
    )
    assert counts["products_deactivated"] == 1
    orech, koks = db.tables["products"]
    # The price trigger moves the price; the export does not overwrite it before the insert.
    assert orech["price_czk"] == 6900 and koks["active"] is False
    assert db.tables["sellers"][0]["name"] == "Upraveno na webu"  # names edited on the web stay


def test_a_claimed_profile_is_not_touched() -> None:
    owned = dict(SELLER, id="s-1", external_key="demosklad", owner_id="user-1", slug="demosklad",
                 city="Jinde")  # fmt: skip
    db = MemoryDb({"sellers": [owned]})
    counts = write_export(payload(), db)  # type: ignore[arg-type]
    assert counts["sellers_owned_skipped"] == 1
    assert counts["products_new"] == 0 and db.tables["price_observations"] == []
    assert db.tables["sellers"][0]["city"] == "Jinde"


def test_dry_run_writes_nothing() -> None:
    db = MemoryDb()
    counts = write_export(payload(), db, dry_run=True)  # type: ignore[arg-type]
    assert (counts["sellers_new"], counts["products_new"], counts["observations"]) == (1, 2, 2)
    assert db.writes == []


def test_slug_collision_gets_a_number() -> None:
    db = MemoryDb({"sellers": [{"id": "x", "slug": "demosklad", "external_key": None}]})
    write_export(payload(), db)  # type: ignore[arg-type]
    assert db.tables["sellers"][1]["slug"] == "demosklad-2"


def test_the_tools_export_goes_through_the_writer(tools_client: Any) -> None:
    """Contract between the services: the real GET /export payload is what the writer reads."""
    exported = tools_client.export()
    assert exported["schema_version"] == "1.0"
    assert "demopaliva" in {run["source_id"] for run in exported["runs"]}
    # The fixture sellers have no committed location, so they are skipped, not written
    # half-way; their runs are still recorded.
    db = MemoryDb()
    counts = write_export(exported, db)  # type: ignore[arg-type]
    assert db.tables["sellers"] == [] and db.tables["products"] == []
    assert counts["runs"] == len(exported["runs"])
    assert {row["status"] for row in db.tables["scrape_runs"]} == {"success"}


def test_existing_sellers_are_matched_by_domain_then_ico() -> None:
    assert domain("https://www.Palivos.cz/kontakty") == "palivos.cz"
    existing = [
        {"id": "a", "slug": "palivos", "name": "Palivos", "website": "http://palivos.cz/",
         "ico": None},
        {"id": "b", "slug": "demo", "name": "Demo", "website": None, "ico": "19240538"},
    ]  # fmt: skip
    exported = [{"seller_key": "palivos", "website": "https://www.palivos.cz", "company_ico": None},
                SELLER, {"seller_key": "novy", "website": "https://novy.example"}]  # fmt: skip
    found = [
        (s["seller_key"], r["id"] if r else None, how)
        for s, r, how in match_sellers(exported, existing)
    ]
    assert found == [("palivos", "a", "domain"), ("demosklad", "b", "ico"), ("novy", None, "new")]

    db = MemoryDb({"sellers": [dict(row, external_key=None, owner_id=None) for row in existing]})
    lines = link(db, {"sellers": exported}, apply=False)  # type: ignore[arg-type]
    assert db.writes == [] and lines[0].startswith("palivos          -> palivos")
    link(db, {"sellers": exported}, apply=True)  # type: ignore[arg-type]
    assert [row["external_key"] for row in db.tables["sellers"]] == ["palivos", "demosklad"]
