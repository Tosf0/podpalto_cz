"""Loads the source registry (``sources.yaml``): the list of sites the collector may visit."""

from __future__ import annotations

import re
from enum import Enum, IntEnum
from importlib import resources
from pathlib import Path
from typing import Literal

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
    RENDERED_HTML = "rendered_html"  # like static_html, but the page needs JavaScript
    IMAGE_OCR = "image_ocr"  # price lists published as images, read by OCR

    @property
    def needs_extraction(self) -> bool:
        return self in (SourceKind.STATIC_HTML, SourceKind.RENDERED_HTML, SourceKind.IMAGE_OCR)


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


class SellerLocation(BaseModel):
    """Where customers buy (the yard or shop), when it is not the company seat in ARES.

    Either the RÚIAN address point code (preferred, look it up at https://vdp.cuzk.cz or
    with ``podpalto-locate-sellers --find``), or coordinates with the town for a yard that
    has no address point.
    """

    ruian: int | None = Field(None, gt=0, description="kód adresního místa")
    lat: float | None = Field(None, ge=48.5, le=51.1)
    lng: float | None = Field(None, ge=12.0, le=18.9)
    street: str = ""
    city: str | None = None
    zip: str | None = Field(None, pattern=r"^\d{3} ?\d{2}$")
    # Not "municipality": the centre of a town would put delivery distances wrong (spec 5.3).
    precision: Literal["building", "street"] = "building"
    from_seller_map: bool = Field(
        False, description="Coordinates taken from the map embedded on the seller's page"
    )
    note: str = Field("", description="Where the address comes from, e.g. the contact page")

    @model_validator(mode="after")
    def _one_way(self) -> SellerLocation:
        manual = (self.lat, self.lng, self.city, self.zip)
        if self.ruian is None and None in manual:
            raise ValueError("location needs ruian, or lat, lng, city and zip")
        if self.ruian is not None and any(value is not None for value in manual):
            raise ValueError("location takes ruian or coordinates, not both")
        if self.from_seller_map and self.ruian is not None:
            raise ValueError("from_seller_map is for coordinates, not for a RÚIAN code")
        return self


class Source(BaseModel):
    id: str = Field(
        ...,
        pattern=r"^[a-z0-9_]+$",
        description="Never renamed once exported: it is the seller's key in Supabase",
    )
    seller: str
    name: str | None = Field(
        None,
        description="Trade name customers know ('Uhelné sklady Štefl'); omitted = the ARES "
        "name without the legal form, else the domain. Used only when the seller is created.",
    )
    seller_key: str | None = Field(
        None,
        pattern=r"^[a-z0-9_]+$",
        description="id of another source read from the same seller, so both export to one "
        "seller; omitted = this source's own id",
    )
    base_url: HttpUrl
    kind: SourceKind
    pillar: Pillar = Pillar.ESHOPS
    ico: str | None = Field(None, pattern=r"^\d{8}$", description="Company ID (IČO) of the seller")
    region: Region | None = Field(None, description="Region (kraj) where the seller is based")
    price_region: Region | None = Field(
        None, description="Where its prices apply: a region, or CZ for nationwide delivery"
    )
    location: SellerLocation | None = Field(
        None, description="The yard or shop; omitted = the company seat from ARES"
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
        description="Regex of a link (href or img src) on each page. static_html follows the "
        "first match, e.g. 'cenik-uhli.*\\.pdf' for a PDF whose file name changes; "
        "image_ocr reads every matching image",
    )
    enabled: bool = True
    export: bool = Field(
        True,
        description="False = collected for the tools, but not sent to the web app "
        "(e.g. a seller whose delivery areas the map cannot show yet)",
    )
    consent: Consent = Consent.NONE
    notes: str = ""

    @property
    def export_seller_key(self) -> str:
        """The seller's stable key (``sellers.external_key``, spec section 4).

        An artificial id that never changes: IČO, address or RÚIAN code are only attributes
        of the seller and are updated in place. Chains with several branches add
        ``-<branch slug>`` per branch when exporting.
        """
        return self.seller_key or self.id

    @property
    def origin(self) -> str:
        return str(self.base_url).rstrip("/")

    @model_validator(mode="after")
    def _check_kind(self) -> Source:
        if self.kind is SourceKind.HEUREKA_FEED and not self.feed_path:
            raise ValueError("a heureka_feed source needs feed_path")
        if self.kind.needs_extraction:
            if not self.page_paths:
                raise ValueError(f"a {self.kind.value} source needs page_paths")
            if any(not path.startswith("/") for path in self.page_paths):
                raise ValueError("page_paths must start with '/'")
        if self.kind is SourceKind.IMAGE_OCR and not self.document_link:
            raise ValueError("an image_ocr source needs document_link (regex of the images)")
        for pattern in (self.url_filter, self.document_link):
            if pattern:
                re.compile(pattern)
        return self

    @property
    def entry_url(self) -> str:
        """First URL the collector reads: the feed, the sitemap or the first price list."""
        if self.kind is SourceKind.HEUREKA_FEED:
            return self.origin + (self.feed_path or "")
        if self.kind.needs_extraction:
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
    by_id = {source.id: source for source in sources}
    for source in sources:
        if source.seller_key is None:
            continue
        target = by_id.get(source.seller_key)
        if target is None:
            raise ValueError(f"{source.id}: seller_key {source.seller_key!r} is not a source id")
        if target.seller_key is not None:
            raise ValueError(
                f"{source.id}: seller_key must name the first source of the seller, "
                f"{target.id} itself points to {target.seller_key}"
            )
    return sources


def enabled_sources() -> list[Source]:
    return [source for source in load_sources() if source.enabled]
