"""Snapshot database (SQLite): what was collected from which source and when.

Every successful collection adds one row to ``snapshots`` and one row per price record
to ``records``. Nothing is updated in place, so price history is a plain query. The
tools read only the newest successful snapshot of each source.

The ``records`` columns are the fields of ``SolidFuelPriceRecord`` (PDF, section 4.3).
"""

from __future__ import annotations

import json
import sqlite3
from collections.abc import Iterable, Iterator
from contextlib import contextmanager
from pathlib import Path

from pydantic import BaseModel

from podpalto_tools.collect.normalize import SolidFuelPriceRecord
from podpalto_tools.schemas import FuelType

_SQL_TYPES = {int: "INTEGER", float: "REAL", bool: "INTEGER", str: "TEXT"}


def _column_type(name: str) -> str:
    annotation = SolidFuelPriceRecord.model_fields[name].annotation
    for python_type, sql_type in _SQL_TYPES.items():
        if annotation is python_type or python_type in getattr(annotation, "__args__", ()):
            return sql_type
    return "TEXT"


_RECORD_COLUMNS = list(SolidFuelPriceRecord.model_fields)
_SCHEMA = (
    """
CREATE TABLE IF NOT EXISTS snapshots (
    id             INTEGER PRIMARY KEY,
    source_id      TEXT NOT NULL,
    fetched_at     TEXT NOT NULL,      -- ISO 8601, UTC
    status         TEXT NOT NULL,      -- ok | error | blocked_by_robots
    http_status    INTEGER,
    content_sha256 TEXT,
    raw_path       TEXT,               -- copy of what was downloaded (feed, pages, rows)
    changed        INTEGER,            -- 0 when identical to the previous snapshot
    item_count     INTEGER,
    offer_count    INTEGER,
    error          TEXT
);
CREATE INDEX IF NOT EXISTS snapshots_by_source ON snapshots (source_id, id);

CREATE TABLE IF NOT EXISTS records (
    id          INTEGER PRIMARY KEY,
    snapshot_id INTEGER NOT NULL REFERENCES snapshots (id),
"""
    + ",\n".join(f"    {name} {_column_type(name)}" for name in _RECORD_COLUMNS)
    + """
);
CREATE INDEX IF NOT EXISTS records_by_snapshot ON records (snapshot_id, fuel_category);
"""
)


class Snapshot(BaseModel):
    id: int
    source_id: str
    fetched_at: str
    status: str
    http_status: int | None = None
    content_sha256: str | None = None
    raw_path: str | None = None
    changed: bool | None = None
    item_count: int | None = None
    offer_count: int | None = None
    error: str | None = None


class Store:
    def __init__(self, db_path: Path) -> None:
        self.db_path = db_path
        db_path.parent.mkdir(parents=True, exist_ok=True)
        with self._connect() as conn:
            conn.executescript(_SCHEMA)

    @contextmanager
    def _connect(self) -> Iterator[sqlite3.Connection]:
        # One short-lived connection per operation: safe with FastAPI's thread pool.
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        try:
            with conn:  # commit on success, roll back on error
                yield conn
        finally:
            conn.close()

    def add_snapshot(
        self,
        *,
        source_id: str,
        fetched_at: str,
        status: str,
        http_status: int | None = None,
        content_sha256: str | None = None,
        raw_path: str | None = None,
        changed: bool | None = None,
        item_count: int | None = None,
        records: Iterable[SolidFuelPriceRecord] = (),
        error: str | None = None,
    ) -> Snapshot:
        """Store a snapshot and its records in one transaction."""
        records = list(records)
        with self._connect() as conn:
            cursor = conn.execute(
                "INSERT INTO snapshots (source_id, fetched_at, status, http_status, "
                "content_sha256, raw_path, changed, item_count, offer_count, error) "
                "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                (source_id, fetched_at, status, http_status, content_sha256, raw_path,
                 changed, item_count, len(records) if status == "ok" else None, error),
            )  # fmt: skip
            snapshot_id = cursor.lastrowid
            placeholders = ", ".join("?" for _ in _RECORD_COLUMNS)
            conn.executemany(
                f"INSERT INTO records (snapshot_id, {', '.join(_RECORD_COLUMNS)}) "
                f"VALUES (?, {placeholders})",
                [(snapshot_id, *self._record_row(record)) for record in records],
            )
            row = conn.execute("SELECT * FROM snapshots WHERE id = ?", (snapshot_id,)).fetchone()
        return self._snapshot(row)

    @staticmethod
    def _record_row(record: SolidFuelPriceRecord) -> list:
        data = record.model_dump(mode="json")
        data["flags"] = json.dumps(data["flags"])
        return [data[column] for column in _RECORD_COLUMNS]

    @staticmethod
    def _snapshot(row: sqlite3.Row) -> Snapshot:
        data = dict(row)
        if data["changed"] is not None:
            data["changed"] = bool(data["changed"])
        return Snapshot(**data)

    def last_snapshot(self, source_id: str, *, ok_only: bool = False) -> Snapshot | None:
        query = "SELECT * FROM snapshots WHERE source_id = ?"
        if ok_only:
            query += " AND status = 'ok'"
        with self._connect() as conn:
            row = conn.execute(query + " ORDER BY id DESC LIMIT 1", (source_id,)).fetchone()
        return self._snapshot(row) if row else None

    def snapshots(self) -> list[Snapshot]:
        """Every snapshot, oldest first (the export picks the newest per source)."""
        with self._connect() as conn:
            rows = conn.execute("SELECT * FROM snapshots ORDER BY id").fetchall()
        return [self._snapshot(row) for row in rows]

    def records(self, snapshot_id: int) -> list[SolidFuelPriceRecord]:
        """The records of one snapshot, in the order they were stored."""
        with self._connect() as conn:
            rows = conn.execute(
                "SELECT * FROM records WHERE snapshot_id = ? ORDER BY id", (snapshot_id,)
            ).fetchall()
        return [self._record(row) for row in rows]

    @staticmethod
    def _record(row: sqlite3.Row) -> SolidFuelPriceRecord:
        data = {key: row[key] for key in _RECORD_COLUMNS}
        data["flags"] = json.loads(data["flags"])
        return SolidFuelPriceRecord(**data)

    def latest_records(
        self, source_ids: Iterable[str], fuel_category: FuelType | None = None
    ) -> list[SolidFuelPriceRecord]:
        """Records from the newest successful snapshot of each given source."""
        source_ids = list(source_ids)
        if not source_ids:
            return []
        marks = ", ".join("?" for _ in source_ids)
        query = (
            "SELECT r.* FROM records r WHERE r.snapshot_id IN (SELECT MAX(id) FROM snapshots "
            f"WHERE status = 'ok' AND source_id IN ({marks}) GROUP BY source_id)"
        )
        args: list = [*source_ids]
        if fuel_category is not None:
            query += " AND r.fuel_category = ?"
            args.append(fuel_category.value)
        with self._connect() as conn:
            rows = conn.execute(query + " ORDER BY r.seller_name, r.id", args).fetchall()
        return [self._record(row) for row in rows]

    def has_snapshot(self, source_ids: Iterable[str]) -> bool:
        source_ids = list(source_ids)
        if not source_ids:
            return False
        marks = ", ".join("?" for _ in source_ids)
        with self._connect() as conn:
            row = conn.execute(
                f"SELECT 1 FROM snapshots WHERE status = 'ok' AND source_id IN ({marks}) LIMIT 1",
                source_ids,
            ).fetchone()
        return row is not None
