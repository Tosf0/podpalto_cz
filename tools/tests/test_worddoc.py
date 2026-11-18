"""Word price lists (.doc, .docx) reached through a link on a page. The files are built by
hand for a fictional forest: a Compound File with a minimal Word 97 text, and a .docx with
one table. No network, no Word."""

import io
import struct
import zipfile

import pytest
from fastapi.testclient import TestClient
from podpalto_tools.api import create_app
from podpalto_tools.collect.collector import FetchResponse
from podpalto_tools.collect.pricelist import document_to_text
from podpalto_tools.collect.worddoc import WordError, doc_to_text, docx_to_text

END, FREE = 0xFFFFFFFE, 0xFFFFFFFF


def make_cfb(streams: dict[str, bytes]) -> bytes:
    """A version-3 Compound File: FAT in sector 0, directory in sector 1, then each stream
    in regular sectors (streams are padded to 4096 bytes, so no mini stream is needed)."""
    sector = 512
    body, chains, next_sector = [], [], 2
    for name, data in streams.items():
        data = data.ljust(max(len(data), 4096), b"\0")
        count = -(-len(data) // sector)
        chains.append((name, next_sector, count, len(data)))
        body.append(data.ljust(count * sector, b"\0"))
        next_sector += count
    fat = [0xFFFFFFFD, END]  # sector 0 = FAT, sector 1 = directory (one sector)
    for _, start, count, _ in chains:
        fat += [start + i + 1 for i in range(count - 1)] + [END]
    fat += [FREE] * (128 - len(fat))

    def entry(name: str, kind: int, start: int, size: int) -> bytes:
        encoded = (name + "\0").encode("utf-16-le")
        raw = encoded.ljust(64, b"\0") + struct.pack("<HBB", len(encoded), kind, 1)
        raw += struct.pack("<III", FREE, FREE, FREE) + b"\0" * 36
        return raw + struct.pack("<II", start, size) + b"\0" * 4

    directory = entry("Root Entry", 5, END, 0)
    directory += b"".join(entry(name, 2, start, size) for name, start, _, size in chains)
    header = bytes.fromhex("d0cf11e0a1b11ae1") + b"\0" * 16
    header += struct.pack("<HHHHH", 0x3E, 3, 0xFFFE, 9, 6) + b"\0" * 10
    header += struct.pack("<IIIIIIII", 1, 1, 0, 4096, END, 0, END, 0)
    header += struct.pack("<109I", 0, *[FREE] * 108)
    return header + struct.pack("<128I", *fat) + directory.ljust(sector, b"\0") + b"".join(body)


def make_doc(pieces: list[tuple[str, bool]]) -> bytes:
    """Word 97 text from pieces (text, compressed=8-bit cp1252 / else UTF-16)."""
    text_at, cps, pcds, blob = 0x800, [0], b"", b""
    for text, compressed in pieces:
        encoded = text.encode("cp1252" if compressed else "utf-16-le")
        offset = text_at + len(blob)
        fc = (offset * 2) | 0x40000000 if compressed else offset
        pcds += struct.pack("<HIH", 0, fc, 0)
        cps.append(cps[-1] + len(text))
        blob += encoded
    plc = struct.pack(f"<{len(cps)}I", *cps) + pcds
    table = b"\x02" + struct.pack("<I", len(plc)) + plc
    word = bytearray(text_at) + blob
    struct.pack_into("<H", word, 0, 0xA5EC)
    struct.pack_into("<H", word, 0x0A, 0x0200)  # fWhichTblStm: the table stream is 1Table
    struct.pack_into("<I", word, 0x4C, cps[-1])  # ccpText
    struct.pack_into("<II", word, 0x01A2, 0, len(table))  # fcClx, lcbClx
    return make_cfb({"WordDocument": bytes(word), "1Table": table})


DOC_PIECES = [
    ("CENIK PALIVOVEHO DRIVI\rSortiment\x07Cena s DPH\x07\x07", True),
    ("Listnaté tvrdé – štípané\x071.600,- Kč/prms\x07\x07Jehličnaté\x07\x07\x07\r", False),
    ("Platnost \x13 DATE \\@ d.M.yyyy \x1417.08.2026\x15\r", True),
]


def make_docx(rows: list[list[str]], heading: str) -> bytes:
    w = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"'
    cells = "".join(
        "<w:tr>"
        + "".join(f"<w:tc><w:p><w:r><w:t>{c}</w:t></w:r></w:p></w:tc>" for c in row)
        + "</w:tr>"
        for row in rows
    )
    xml = (f'<?xml version="1.0" encoding="UTF-8"?><w:document {w}><w:body>'
           f"<w:p><w:r><w:t>{heading}</w:t></w:r></w:p><w:tbl>{cells}</w:tbl>"
           "</w:body></w:document>")  # fmt: skip
    out = io.BytesIO()
    with zipfile.ZipFile(out, "w") as archive:
        archive.writestr("[Content_Types].xml", "<Types/>")
        archive.writestr("word/document.xml", xml)
    return out.getvalue()


def test_doc_text_from_8_bit_and_unicode_pieces():
    lines = doc_to_text(make_doc(DOC_PIECES)).splitlines()
    assert lines == [
        "CENIK PALIVOVEHO DRIVI",
        "Sortiment | Cena s DPH",
        "Listnaté tvrdé – štípané | 1.600,- Kč/prms",
        "Jehličnaté",  # a row whose price cell is empty
        "Platnost 17.08.2026",  # the field's result, not its code
    ]


def test_docx_table_rows_become_lines():
    docx = make_docx([["Sortiment", "Cena s DPH"], ["Buk – štípaný 33 cm", "2 310 Kč/prm"]],
                     "Ceník dříví")  # fmt: skip
    assert docx_to_text(docx).splitlines() == [
        "Ceník dříví", "Sortiment | Cena s DPH", "Buk – štípaný 33 cm | 2 310 Kč/prm",
    ]  # fmt: skip


def test_document_to_text_recognises_word_by_content_not_name():
    assert "1.600,- Kč/prms" in document_to_text(make_doc(DOC_PIECES))
    assert "2 310 Kč/prm" in document_to_text(make_docx([["Buk", "2 310 Kč/prm"]], "Ceník"))


@pytest.mark.parametrize(
    "broken",
    [
        bytes.fromhex("d0cf11e0a1b11ae1") + b"\0" * 100,  # truncated header
        make_cfb({"Something": b"x"}),  # a compound file without Word streams
        make_cfb({"WordDocument": b"\0" * 600, "1Table": b""}),  # no FIB
    ],
)
def test_broken_word_files_raise_a_word_error(broken):
    with pytest.raises(WordError):
        doc_to_text(broken)


def test_a_sector_loop_does_not_hang():
    doc = bytearray(make_doc(DOC_PIECES))
    first_fat_entry = 512 + 4 * 2  # FAT entry of the first stream sector (sector 2)
    struct.pack_into("<I", doc, first_fat_entry, 2)  # points to itself
    with pytest.raises(WordError):
        doc_to_text(bytes(doc))


ORIGIN = "https://demolesy.example"
REGISTRY = f"""
sources:
  - id: demolesy
    seller: DemoLesy
    base_url: {ORIGIN}
    kind: static_html
    pillar: 4
    page_paths: [/palivove_drivi]
    document_link: soubor/.*cenik.*\\.docx?
"""
DOC_URL = f"{ORIGIN}/soubor/123_cenik_8_2026.doc"
PAGE = f'<html><body><a class="file-card" href="{DOC_URL}">Ceník 8-2026</a></body></html>'


def test_doc_price_list_through_the_api(data_dir):
    (data_dir.parent / "sources.yaml").write_text(REGISTRY, encoding="utf-8")
    pages = {f"{ORIGIN}/robots.txt": (404, b""), f"{ORIGIN}/palivove_drivi": (200, PAGE.encode()),
             DOC_URL: (200, make_doc(DOC_PIECES))}  # fmt: skip
    api = TestClient(create_app(fetch=lambda url: FetchResponse(*pages.get(url, (404, b""))),
                                sleep=lambda s: None))  # fmt: skip
    result = api.post("/sources/demolesy/pages").json()
    assert result["status"] == "ok"
    (page,) = result["pages"]
    assert page["url"] == DOC_URL and "Listnaté tvrdé – štípané | 1.600,- Kč/prms" in page["text"]
    rows = [{"product_name": "Listnaté tvrdé – štípané", "price_text": "1.600,- Kč/prms",
             "original_unit": "prms", "fuel_category": "firewood",
             "price_includes_vat": True}]  # fmt: skip
    body = {"pages": [{"page_id": page["page_id"],
                       "extraction": {"price_list_found": True, "rows": rows}}]}  # fmt: skip
    stored = api.post("/sources/demolesy/extraction", json=body).json()
    assert stored["accepted"] == 1
    assert stored["verdicts"][0]["record"]["normalized_price_per_prms_vat"] == 1600


def test_broken_doc_is_an_error_not_a_crash(data_dir):
    (data_dir.parent / "sources.yaml").write_text(REGISTRY, encoding="utf-8")
    pages = {f"{ORIGIN}/robots.txt": (404, b""), f"{ORIGIN}/palivove_drivi": (200, PAGE.encode()),
             DOC_URL: (200, bytes.fromhex("d0cf11e0a1b11ae1") + b"\0" * 600)}  # fmt: skip
    api = TestClient(create_app(fetch=lambda url: FetchResponse(*pages.get(url, (404, b""))),
                                sleep=lambda s: None))  # fmt: skip
    result = api.post("/sources/demolesy/pages").json()
    assert result["status"] == "error" and "not a readable Word file" in result["detail"]
