"""Collects the registered sources into the snapshot database.

Three ways to read a source, chosen by ``kind`` in the registry. The app's
CollectionFlow routes each source to one of them (PDF, section 4.1):

heureka_feed   robots.txt + the XML feed: two requests.
shoptet_html   robots.txt + sitemap + the shop's public product pages, one request per
               page with a pause in between and an upper limit of pages.
static_html    robots.txt + the price-list pages named in the registry. Their text goes
               to the extraction crew; the crew's rows come back to ``ingest_extraction``,
               which verifies them against the stored page text and normalises them.

Rules that hold for all: only URLs that robots.txt allows are requested, and a refusal
(403, 429, robots.txt) is recorded and left alone. There are no retries and no attempts
to get around a block.
"""

from __future__ import annotations

import dataclasses
import hashlib
import json
import re
import time
import urllib.robotparser
from collections.abc import Callable, Iterable
from dataclasses import dataclass
from datetime import datetime, timezone
from statistics import median

import httpx
from pydantic import BaseModel, Field
from pypdf.errors import PyPdfError as PdfError

from podpalto_tools.collect.heureka import FeedError, FeedItem, parse_feed
from podpalto_tools.collect.normalize import SolidFuelPriceRecord, normalize
from podpalto_tools.collect.ocr import OcrError
from podpalto_tools.collect.pricelist import (
    MAX_PAGE_CHARS,
    RowVerdict,
    SellerPriceExtractionList,
    document_to_text,
    drop_duplicates,
    find_document_link,
    find_document_links,
    unique_item_ids,
    verify_rows,
)
from podpalto_tools.collect.shoptet import parse_product_page, parse_sitemap, product_candidates
from podpalto_tools.collect.source_registry import Source, SourceKind, enabled_sources, load_sources
from podpalto_tools.collect.store import Store
from podpalto_tools.settings import Settings, get_settings

MAX_RESPONSE_BYTES = 50_000_000
MAX_CHILD_SITEMAPS = 5
MAX_FAILED_PAGE_SHARE = 0.2
_REFUSED = {401, 403, 429}


class FetchError(Exception):
    """Network-level failure (DNS, timeout, oversized body)."""


@dataclass(frozen=True)
class FetchResponse:
    status: int
    content: bytes


Fetch = Callable[[str], FetchResponse]
Allowed = Callable[[str], bool]


def http_fetch(settings: Settings) -> Fetch:
    """Default fetcher: one plain GET, no retries."""

    def fetch(url: str) -> FetchResponse:
        try:
            with httpx.stream(
                "GET",
                url,
                headers={"User-Agent": settings.user_agent},
                timeout=settings.http_timeout_s,
                follow_redirects=True,
            ) as response:
                body = bytearray()
                for chunk in response.iter_bytes():
                    body += chunk
                    if len(body) > MAX_RESPONSE_BYTES:
                        raise FetchError(f"response larger than {MAX_RESPONSE_BYTES} bytes")
                return FetchResponse(response.status_code, bytes(body))
        except httpx.HTTPError as exc:
            raise FetchError(f"{type(exc).__name__}: {exc}") from exc

    return fetch


class CollectResult(BaseModel):
    source_id: str
    status: str
    """ok | error | blocked_by_robots | skipped_recent | needs_extraction"""
    fetched_at: str | None = None
    http_status: int | None = None
    items: int | None = None
    offers: int | None = None
    changed: bool | None = None
    detail: str = ""


class _Failure(Exception):
    def __init__(self, status: str, detail: str, http_status: int | None = None) -> None:
        super().__init__(detail)
        self.status, self.detail, self.http_status = status, detail, http_status


@dataclass
class _Acquired:
    items: list[FeedItem]
    raw: bytes
    raw_suffix: str
    detail: str = ""


def _load_robots(source: Source, fetch: Fetch, user_agent: str) -> tuple[Allowed, float]:
    """Return the "may I fetch this URL" test and the crawl delay the site asks for.

    RFC 9309: no robots.txt (4xx) allows everything, an unreachable one allows nothing.
    """
    try:
        response = fetch(source.robots_url)
    except FetchError as exc:
        raise _Failure("blocked_by_robots", f"robots.txt unreachable: {exc}") from exc
    if 400 <= response.status < 500:
        return (lambda url: True), 0.0
    if response.status != 200:
        raise _Failure("blocked_by_robots", f"robots.txt returned HTTP {response.status}")
    parser = urllib.robotparser.RobotFileParser()
    parser.parse(response.content.decode("utf-8", errors="replace").splitlines())
    delay = parser.crawl_delay(user_agent)
    return (lambda url: parser.can_fetch(user_agent, url)), float(delay or 0)


def _get(fetch: Fetch, url: str, what: str) -> bytes:
    try:
        response = fetch(url)
    except FetchError as exc:
        raise _Failure("error", f"{what}: {exc}") from exc
    if response.status != 200:
        raise _Failure("error", f"{what} returned HTTP {response.status}", response.status)
    return response.content


def _acquire_feed(source: Source, fetch: Fetch, allowed: Allowed) -> _Acquired:
    if not allowed(source.entry_url):
        raise _Failure("blocked_by_robots", f"robots.txt disallows {source.feed_path}")
    content = _get(fetch, source.entry_url, "feed")
    try:
        items, skipped = parse_feed(content)
    except FeedError as exc:
        raise _Failure("error", str(exc), 200) from exc
    return _Acquired(
        items, content, ".xml", f"{skipped} incomplete items skipped" if skipped else ""
    )


def _acquire_shoptet(
    source: Source,
    fetch: Fetch,
    allowed: Allowed,
    limit: int,
    pause: Callable[[], None],
) -> _Acquired:
    def sitemap(url: str) -> tuple[str, list[str]]:
        if not allowed(url):
            raise _Failure("blocked_by_robots", f"robots.txt disallows {url}")
        try:
            return parse_sitemap(_get(fetch, url, "sitemap"))
        except FeedError as exc:
            raise _Failure("error", str(exc), 200) from exc

    kind, locations = sitemap(source.entry_url)
    if kind == "index":
        children, locations = locations[:MAX_CHILD_SITEMAPS], []
        for child in children:
            if not child.startswith(source.origin + "/"):
                continue
            pause()
            locations += sitemap(child)[1]

    candidates = [u for u in product_candidates(locations, source.origin, source.url_filter)]
    urls = [u for u in candidates if allowed(u)]
    disallowed = len(candidates) - len(urls)
    truncated = max(0, len(urls) - limit)
    urls = urls[:limit]

    items: list[FeedItem] = []
    product_pages = failed = 0
    for url in urls:
        pause()
        try:
            response = fetch(url)
        except FetchError as exc:
            raise _Failure("error", f"page {url}: {exc}") from exc
        if response.status in _REFUSED:
            # The shop is telling us to stop. Do so; do not keep a partial snapshot.
            raise _Failure(
                "error", f"page {url} returned HTTP {response.status}; stopped", response.status
            )
        if response.status != 200:
            failed += 1
            continue
        found = parse_product_page(response.content.decode("utf-8", errors="replace"), url)
        product_pages += bool(found)
        items += found
    if urls and failed / len(urls) > MAX_FAILED_PAGE_SHARE:
        raise _Failure("error", f"{failed} of {len(urls)} pages failed; snapshot discarded")

    detail = f"{len(urls)} pages fetched, {product_pages} with a product"
    for count, label in [
        (failed, "failed"),
        (disallowed, "disallowed by robots.txt"),
        (truncated, f"skipped by the {limit}-page limit"),
    ]:
        if count:
            detail += f", {count} {label}"
    # The raw copy is the extracted records, not ~100 kB of HTML per page.
    raw = json.dumps(
        [dataclasses.asdict(item) for item in items], ensure_ascii=False, sort_keys=True, indent=1
    ).encode("utf-8")
    return _Acquired(items, raw, ".json", detail)


def collect_source(
    source: Source,
    store: Store,
    fetch: Fetch,
    settings: Settings,
    now: datetime | None = None,
    sleep: Callable[[float], None] = time.sleep,
) -> CollectResult:
    now = now or datetime.now(timezone.utc)
    fetched_at = now.isoformat(timespec="seconds")
    if source.kind.needs_extraction:
        return CollectResult(
            source_id=source.id,
            status="needs_extraction",
            detail="price-list source: run the CollectionFlow of the app service",
        )
    if skipped := _skip_if_recent(source, store, settings, now):
        return skipped

    try:
        allowed, crawl_delay = _load_robots(source, fetch, settings.user_agent)
        if source.kind is SourceKind.HEUREKA_FEED:
            acquired = _acquire_feed(source, fetch, allowed)
        else:
            delay = max(settings.page_delay_s, crawl_delay)
            acquired = _acquire_shoptet(
                source,
                fetch,
                allowed,
                limit=source.max_pages or settings.max_pages,
                pause=lambda: sleep(delay),
            )
    except _Failure as failure:
        store.add_snapshot(
            source_id=source.id,
            fetched_at=fetched_at,
            status=failure.status,
            http_status=failure.http_status,
            error=failure.detail,
        )
        return CollectResult(
            source_id=source.id,
            status=failure.status,
            fetched_at=fetched_at,
            http_status=failure.http_status,
            detail=failure.detail,
        )

    digest = hashlib.sha256(acquired.raw).hexdigest()
    last_ok = store.last_snapshot(source.id, ok_only=True)
    changed = last_ok is None or last_ok.content_sha256 != digest
    if changed:
        raw_file = settings.raw_dir / source.id / f"{now:%Y%m%dT%H%M%SZ}{acquired.raw_suffix}"
        raw_file.parent.mkdir(parents=True, exist_ok=True)
        raw_file.write_bytes(acquired.raw)
        raw_path = raw_file.relative_to(settings.data_dir).as_posix()
    else:
        raw_path = last_ok.raw_path  # identical content: point at the copy we already have

    records = [
        record
        for item in acquired.items
        if (record := normalize(item, source, fetched_at)) is not None
    ]
    flag_market_outliers(records, store, source.id)
    store.add_snapshot(
        source_id=source.id,
        fetched_at=fetched_at,
        status="ok",
        http_status=200,
        content_sha256=digest,
        raw_path=raw_path,
        changed=changed,
        item_count=len(acquired.items),
        records=records,
    )
    return CollectResult(
        source_id=source.id,
        status="ok",
        fetched_at=fetched_at,
        http_status=200,
        items=len(acquired.items),
        offers=len(records),
        changed=changed,
        detail=acquired.detail,
    )


def _skip_if_recent(
    source: Source, store: Store, settings: Settings, now: datetime
) -> CollectResult | None:
    previous = store.last_snapshot(source.id)
    if not previous or settings.min_interval_s <= 0:
        return None
    age = (now - datetime.fromisoformat(previous.fetched_at)).total_seconds()
    if age >= settings.min_interval_s:
        return None
    return CollectResult(
        source_id=source.id,
        status="skipped_recent",
        fetched_at=previous.fetched_at,
        detail=f"collected {int(age)} s ago, minimum interval is {settings.min_interval_s} s",
    )


# --- market benchmark (the deterministic half of the QA auditor, PDF section 4.2) ---------

OUTLIER_FACTOR = 2.0
MIN_BENCHMARK_SELLERS = 3


def flag_market_outliers(
    records: list[SolidFuelPriceRecord], store: Store, own_source_id: str
) -> None:
    """Flag prices below half or above double the median of the other sellers.

    The benchmark is the newest collection of every other enabled source, per fuel
    category, in CZK/t (or CZK/prms for firewood). Too few other sellers: no flag.
    """
    others = [s.id for s in enabled_sources() if s.id != own_source_id]
    benchmark: dict[tuple[str, str], list[float]] = {}
    for record in store.latest_records(others):
        key, value = _unit_price(record)
        if value is not None:
            benchmark.setdefault((record.fuel_category.value, key), []).append(value)
    for record in records:
        key, value = _unit_price(record)
        peers = benchmark.get((record.fuel_category.value, key), [])
        if value is None or len(peers) < MIN_BENCHMARK_SELLERS:
            continue
        middle = median(peers)
        if not middle / OUTLIER_FACTOR <= value <= middle * OUTLIER_FACTOR:
            record.flags.append("outlier_vs_market")


def _unit_price(record: SolidFuelPriceRecord) -> tuple[str, float | None]:
    if record.normalized_price_per_ton_vat is not None:
        return "t", record.normalized_price_per_ton_vat
    return "prms", record.normalized_price_per_prms_vat


# --- price-list sources: pages for the extraction crew, then its verified rows ------------

_PAGE_ID = re.compile(r"^[0-9a-f]{64}$")


class PriceListPage(BaseModel):
    page_id: str = Field(..., description="sha256 of the page text; quote it back with the rows")
    url: str
    text: str
    truncated: bool = False
    read_by: str = Field("text", description="'text' (HTML, PDF) or 'ocr' (an image)")


class PagesResult(BaseModel):
    source_id: str
    status: str
    """ok | unchanged | error | blocked_by_robots | skipped_recent | not_a_price_list_source"""
    fetched_at: str | None = None
    http_status: int | None = None
    pages: list[PriceListPage] = Field(default_factory=list)
    detail: str = ""


class PageExtraction(BaseModel):
    page_id: str
    extraction: SellerPriceExtractionList


class ExtractionResult(BaseModel):
    source_id: str
    status: str
    """ok | rejected | dry_run | error"""
    accepted: int = 0
    rejected: int = 0
    duplicates: int = Field(0, description="Rows dropped as repeats of an earlier price")
    verdicts: list[RowVerdict] = Field(default_factory=list)
    detail: str = ""


def _pages_dir(settings: Settings, source: Source):
    return settings.raw_dir / source.id / "pages"


def _combined_digest(page_ids: Iterable[str]) -> str:
    return hashlib.sha256("".join(sorted(page_ids)).encode()).hexdigest()


def stored_price_pages(source: Source, store: Store, settings: Settings) -> PagesResult:
    """The pages behind the newest successful snapshot, read from disk (no download).

    Used to extract a price list again after the extraction rules changed.
    """
    last_ok = store.last_snapshot(source.id, ok_only=True)
    if not last_ok or not (last_ok.raw_path or "").endswith(".extraction.json"):
        return PagesResult(
            source_id=source.id, status="error", detail="no stored price-list pages to reuse"
        )
    saved = json.loads((settings.data_dir / last_ok.raw_path).read_text(encoding="utf-8"))
    folder = _pages_dir(settings, source)
    pages = [
        PriceListPage.model_validate_json(
            (folder / f"{part['page_id']}.json").read_text(encoding="utf-8")
        )
        for part in saved["extractions"]
    ]
    return PagesResult(
        source_id=source.id, status="ok", fetched_at=last_ok.fetched_at, http_status=200,
        pages=pages, detail="stored pages, nothing downloaded",
    )  # fmt: skip


def fetch_price_pages(
    source: Source,
    store: Store,
    fetch: Fetch,
    settings: Settings,
    now: datetime | None = None,
    sleep: Callable[[float], None] = time.sleep,
    *,
    reuse_stored: bool = False,
    render: Fetch | None = None,
    ocr: Callable[[bytes], str] | None = None,
) -> PagesResult:
    """Download the price-list pages of a source that needs extraction; return their text.

    static_html    the page (or the first document it links to, e.g. a PDF)
    rendered_html  the page after JavaScript has run (``render``, a headless browser)
    image_ocr      every image the page links to that matches ``document_link``, read by
                   ``ocr``; such pages are marked ``read_by="ocr"``

    Unchanged pages need no extraction: the previous records are confirmed as still
    valid in a new snapshot and the status is ``unchanged``. ``reuse_stored`` returns the
    stored pages of the last successful snapshot instead, without any request.
    """
    now = now or datetime.now(timezone.utc)
    fetched_at = now.isoformat(timespec="seconds")
    if not source.kind.needs_extraction:
        return PagesResult(source_id=source.id, status="not_a_price_list_source")
    if reuse_stored:
        return stored_price_pages(source, store, settings)
    if skipped := _skip_if_recent(source, store, settings, now):
        return PagesResult(
            source_id=source.id, status=skipped.status, fetched_at=skipped.fetched_at,
            detail=skipped.detail,
        )  # fmt: skip

    pages: list[PriceListPage] = []
    try:
        allowed, crawl_delay = _load_robots(source, fetch, settings.user_agent)

        def pause() -> None:
            sleep(max(settings.page_delay_s, crawl_delay))

        def add(url: str, text: str, read_by: str = "text") -> None:
            if not text.strip():
                raise _Failure("error", f"{url} has no readable text", 200)
            pages.append(
                PriceListPage(
                    page_id=hashlib.sha256(text.encode("utf-8")).hexdigest(),
                    url=url,
                    text=text[:MAX_PAGE_CHARS],
                    truncated=len(text) > MAX_PAGE_CHARS,
                    read_by=read_by,
                )
            )

        for number, url in enumerate(source.page_urls):
            if not allowed(url):
                raise _Failure("blocked_by_robots", f"robots.txt disallows {url}")
            if number:
                pause()
            if source.kind is SourceKind.RENDERED_HTML:
                if render is None:
                    raise _Failure("error", "no browser configured for rendered_html sources")
                add(url, document_to_text(_get(render, url, f"rendered page {url}")))
                continue

            content = _get(fetch, url, f"page {url}")
            html = content.decode("utf-8", errors="replace")
            if source.kind is SourceKind.IMAGE_OCR:
                if ocr is None:
                    raise _Failure("error", "no OCR configured for image_ocr sources")
                images = find_document_links(html, url, source.document_link or "")
                if not images:
                    raise _Failure("error", f"no image matching {source.document_link!r} on {url}")
                for image_url in images:
                    if not allowed(image_url):
                        raise _Failure("blocked_by_robots", f"robots.txt disallows {image_url}")
                    pause()
                    image = _get(fetch, image_url, f"image {image_url}")
                    try:
                        add(image_url, ocr(image), read_by="ocr")
                    except OcrError as exc:
                        raise _Failure("error", f"OCR of {image_url}: {exc}", 200) from exc
                continue

            if source.document_link:
                link = find_document_link(html, url, source.document_link)
                if link is None:
                    raise _Failure("error", f"no link matching {source.document_link!r} on {url}")
                if not allowed(link):
                    raise _Failure("blocked_by_robots", f"robots.txt disallows {link}")
                pause()
                url, content = link, _get(fetch, link, f"document {link}")
            try:
                add(url, document_to_text(content))
            except PdfError as exc:
                raise _Failure("error", f"{url} is not a readable PDF: {exc}", 200) from exc
    except _Failure as failure:
        store.add_snapshot(
            source_id=source.id, fetched_at=fetched_at, status=failure.status,
            http_status=failure.http_status, error=failure.detail,
        )  # fmt: skip
        return PagesResult(
            source_id=source.id, status=failure.status, fetched_at=fetched_at,
            http_status=failure.http_status, detail=failure.detail,
        )  # fmt: skip

    folder = _pages_dir(settings, source)
    folder.mkdir(parents=True, exist_ok=True)
    for page in pages:
        (folder / f"{page.page_id}.json").write_text(page.model_dump_json(), encoding="utf-8")

    digest = _combined_digest(page.page_id for page in pages)
    last_ok = store.last_snapshot(source.id, ok_only=True)
    if last_ok and last_ok.content_sha256 == digest:
        previous = store.latest_records([source.id])
        for record in previous:
            record.scraped_at = fetched_at
        store.add_snapshot(
            source_id=source.id, fetched_at=fetched_at, status="ok", http_status=200,
            content_sha256=digest, raw_path=last_ok.raw_path, changed=False,
            item_count=last_ok.item_count, records=previous,
        )  # fmt: skip
        return PagesResult(
            source_id=source.id, status="unchanged", fetched_at=fetched_at, http_status=200,
            detail=f"pages unchanged; {len(previous)} records confirmed without extraction",
        )  # fmt: skip
    return PagesResult(
        source_id=source.id, status="ok", fetched_at=fetched_at, http_status=200, pages=pages
    )


def renormalize_source(
    source: Source, store: Store, settings: Settings, now: datetime | None = None
) -> ExtractionResult:
    """Verify and normalise the crew's stored rows again with the current rules.

    No download and no LLM: the rows of the newest successful extraction are read from
    disk and go through ``ingest_extraction`` as if the crew had just sent them.
    """
    last_ok = store.last_snapshot(source.id, ok_only=True)
    if not last_ok or not (last_ok.raw_path or "").endswith(".extraction.json"):
        return ExtractionResult(
            source_id=source.id, status="error", detail="no stored extraction to renormalise"
        )
    saved = json.loads((settings.data_dir / last_ok.raw_path).read_text(encoding="utf-8"))
    parts = [PageExtraction.model_validate(part) for part in saved["extractions"]]
    # Keep the time the prices were read: a new rule does not make the prices newer.
    when = now or datetime.fromisoformat(last_ok.fetched_at)
    return ingest_extraction(source, parts, store, settings, now=when)


def record_failure(
    source: Source, store: Store, detail: str, now: datetime | None = None
) -> CollectResult:
    """Record a failure that happened outside this service (e.g. the extraction crew).

    It shows in GET /sources like any other failed collection; older records stay served.
    """
    fetched_at = (now or datetime.now(timezone.utc)).isoformat(timespec="seconds")
    store.add_snapshot(source_id=source.id, fetched_at=fetched_at, status="error", error=detail)
    return CollectResult(source_id=source.id, status="error", fetched_at=fetched_at, detail=detail)


def ingest_extraction(
    source: Source,
    extractions: list[PageExtraction],
    store: Store,
    settings: Settings,
    *,
    dry_run: bool = False,
    now: datetime | None = None,
) -> ExtractionResult:
    """Verify the crew's rows against the stored page text, normalise and store them.

    ``dry_run`` only returns the verdicts; it is the extraction crew's guardrail.
    """
    now = now or datetime.now(timezone.utc)
    fetched_at = now.isoformat(timespec="seconds")
    if not source.kind.needs_extraction:
        return ExtractionResult(source_id=source.id, status="error",
                                detail="not a price-list source")  # fmt: skip

    verdicts: list[RowVerdict] = []
    folder = _pages_dir(settings, source)
    for part in extractions:
        stored = folder / f"{part.page_id}.json"
        if not _PAGE_ID.match(part.page_id) or not stored.is_file():
            return ExtractionResult(
                source_id=source.id, status="error",
                detail=f"unknown page_id {part.page_id!r}; fetch the pages first",
            )  # fmt: skip
        page = PriceListPage.model_validate_json(stored.read_text(encoding="utf-8"))
        extra_flags = ("read_by_ocr",) if page.read_by == "ocr" else ()
        for verdict in verify_rows(
            part.extraction, page.text, page.url, source, fetched_at, extra_flags
        ):
            verdict.index = len(verdicts)
            verdicts.append(verdict)
    # Not in the dry run: a duplicate is not something the crew has to fix.
    duplicates = 0 if dry_run else drop_duplicates(verdicts)
    unique_item_ids(verdicts)

    accepted = [v for v in verdicts if v.accepted]
    result = ExtractionResult(
        source_id=source.id,
        status="dry_run" if dry_run else "ok",
        accepted=len(accepted),
        rejected=len(verdicts) - len(accepted) - duplicates,
        duplicates=duplicates,
        verdicts=verdicts,
        detail=f"{duplicates} duplicate rows dropped" if duplicates else "",
    )
    if dry_run:
        return result

    records = [v.record for v in accepted if v.record is not None]
    flag_market_outliers(records, store, source.id)
    raw_file = settings.raw_dir / source.id / f"{now:%Y%m%dT%H%M%SZ}.extraction.json"
    raw_file.parent.mkdir(parents=True, exist_ok=True)
    raw_file.write_text(
        json.dumps(
            {
                "extractions": [part.model_dump(mode="json") for part in extractions],
                "verdicts": [v.model_dump(mode="json", exclude={"record"}) for v in verdicts],
            },
            ensure_ascii=False,
            indent=1,
        ),
        encoding="utf-8",
    )
    if not records:
        # Nothing verified: keep serving the previous snapshot, record why.
        result.status, result.detail = "rejected", "no row passed verification"
        store.add_snapshot(
            source_id=source.id, fetched_at=fetched_at, status="error",
            raw_path=raw_file.relative_to(settings.data_dir).as_posix(),
            item_count=len(verdicts), error=result.detail,
        )  # fmt: skip
        return result
    store.add_snapshot(
        source_id=source.id,
        fetched_at=fetched_at,
        status="ok",
        http_status=200,
        content_sha256=_combined_digest(part.page_id for part in extractions),
        raw_path=raw_file.relative_to(settings.data_dir).as_posix(),
        changed=True,
        item_count=len(verdicts),
        records=records,
    )
    return result


def resolve_sources(
    source_ids: Iterable[str] | None = None, settings: Settings | None = None
) -> list[Source]:
    """The given sources, or every enabled one. Raises KeyError for unknown ids."""
    settings = settings or get_settings()
    sources = {source.id: source for source in load_sources(settings.sources_file)}
    wanted = list(source_ids) if source_ids else [s.id for s in sources.values() if s.enabled]
    unknown = [source_id for source_id in wanted if source_id not in sources]
    if unknown:
        raise KeyError(f"unknown source ids: {unknown}")
    return [sources[source_id] for source_id in wanted]


def collect_all(
    source_ids: Iterable[str] | None = None,
    *,
    fetch: Fetch | None = None,
    settings: Settings | None = None,
    sleep: Callable[[float], None] = time.sleep,
    on_result: Callable[[CollectResult], None] | None = None,
) -> list[CollectResult]:
    """Collect every enabled source, or only the given ones. Disabled sources are refused."""
    settings = settings or get_settings()
    sources = resolve_sources(source_ids, settings)
    store = Store(settings.db_path)
    fetch = fetch or http_fetch(settings)
    results = []
    for source in sources:
        if source.enabled:
            result = collect_source(source, store, fetch, settings, sleep=sleep)
        else:
            result = CollectResult(
                source_id=source.id, status="error", detail="source is disabled in the registry"
            )
        results.append(result)
        if on_result:
            on_result(result)
    return results
