"""Loads the source registry (``sources.yaml``): the list of sites the collector may visit."""

from __future__ import annotations

import re
from enum import Enum, IntEnum
from importlib import resources
from pathlib import Path

import yaml
from pydantic import BaseModel, Field, HttpUrl, model_validator

from podpalto_tools.schemas import Region
from podpalto_tools.settings import get_settings


class SourceKind(str, Enum):
    """How a source is read. The app's CollectionFlow routes on this (PDF, section 4.1).

    Structured kinds are read and normalised entirely by code. ``static_html`` pages are
    fetched by code, then a crew of agents quotes their price rows verbatim, and code
    verifies and normalises those rows.
    """

    HEUREKA_FEED = "heureka_feed"  # XML product feed
    SHOPTET_HTML = "shoptet_html"  # sitemap + public product pages (schema.org microdata)
    STATIC_HTML = "static_html"  # price-list pages without structure (coal yards, forests)

    @property
    def needs_extraction(self) -> bool:
        return self is SourceKind.STATIC_HTML


class Pillar(IntEnum):
    """The five source groups of the report (PDF, section 2)."""

    ESHOPS = 1  # national e-shops and producers of eco-fuels
    COAL_YARDS = 2  # mines and certified coal yards
    DIY_STORES = 3  # DIY chains and builders' merchants
    FORESTS = 4  # state, municipal and church forests, firewood centres
    STATISTICS = 5  # open statistics and reference sources


class Consent(str, Enum):
    NONE = "none"
    REQUESTED = "requested"
    GRANTED = "granted"


class Source(BaseModel):
    id: str = Field(..., pattern=r"^[a-z0-9_]+$")
    seller: str
    base_url: HttpUrl
    kind: SourceKind
    pillar: Pillar = Pillar.ESHOPS
    ico: str | None = Field(None, pattern=r"^\d{8}$", description="Company ID (IČO) of the seller")
    region: Region | None = Field(None, description="Region (kraj) where the seller is based")
    price_region: Region | None = Field(
        None, description="Where its prices apply: a region, or CZ for nationwide delivery"
    )
    price_includes_vat: bool = Field(
        True,
        description="Default when a price list does not say (forestry prices often exclude it)",
    )
    delivery_included: bool | None = Field(
        None, description="Delivery included in the price by default; None = not known"
    )
    price_from: bool = Field(
        False,
        description="All listed prices are 'from' prices (cheapest variant or region); every "
        "record gets the flag price_from",
    )
    feed_path: str | None = Field(None, pattern=r"^/", description="heureka_feed only")
    sitemap_path: str = Field("/sitemap.xml", pattern=r"^/", description="shoptet_html only")
    url_filter: str | None = Field(
        None, description="shoptet_html: regex a sitemap URL path must match to be fetched"
    )
    max_pages: int | None = Field(None, ge=1, description="shoptet_html: overrides the default")
    page_paths: list[str] = Field(
        default_factory=list, description="static_html: price-list pages, e.g. ['/cenik/']"
    )
    document_link: str | None = Field(
        None,
        description="static_html: regex of a link on each page to follow, e.g. 'cenik-uhli.*\\.pdf'"
        " for a PDF price list whose file name changes; the linked document is read instead",
    )
    enabled: bool = True
    consent: Consent = Consent.NONE
    notes: str = ""

    @property
    def origin(self) -> str:
        return str(self.base_url).rstrip("/")

    @model_validator(mode="after")
    def _check_kind(self) -> Source:
        if self.kind is SourceKind.HEUREKA_FEED and not self.feed_path:
            raise ValueError("a heureka_feed source needs feed_path")
        if self.kind is SourceKind.STATIC_HTML:
            if not self.page_paths:
                raise ValueError("a static_html source needs page_paths")
            if any(not path.startswith("/") for path in self.page_paths):
                raise ValueError("page_paths must start with '/'")
        for pattern in (self.url_filter, self.document_link):
            if pattern:
                re.compile(pattern)
        return self

    @property
    def entry_url(self) -> str:
        """First URL the collector reads: the feed, the sitemap or the first price list."""
        if self.kind is SourceKind.HEUREKA_FEED:
            return self.origin + (self.feed_path or "")
        if self.kind is SourceKind.STATIC_HTML:
            return self.origin + self.page_paths[0]
        return self.origin + self.sitemap_path

    @property
    def page_urls(self) -> list[str]:
        return [self.origin + path for path in self.page_paths]

    @property
    def robots_url(self) -> str:
        return self.origin + "/robots.txt"


def load_sources(path: Path | None = None) -> list[Source]:
    path = path or get_settings().sources_file
    if path is None:
        text = resources.files("podpalto_tools.collect").joinpath("sources.yaml").read_text("utf-8")
    else:
        text = path.read_text("utf-8")
    sources = [Source.model_validate(row) for row in yaml.safe_load(text)["sources"]]
    ids = [source.id for source in sources]
    if len(ids) != len(set(ids)):
        raise ValueError(f"duplicate source ids in the registry: {ids}")
    return sources


def enabled_sources() -> list[Source]:
    return [source for source in load_sources() if source.enabled]
