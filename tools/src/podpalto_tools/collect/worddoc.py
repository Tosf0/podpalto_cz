"""Text of Word price lists: .doc (Word 97-2003) and .docx, with the standard library only.

Some sellers publish the price list only as a Word file (Městské lesy Litomyšl: "Ceník
8-2026", .doc). The text is returned like the other documents: one line per paragraph and
table cells joined with " | ", so the extraction crew and the quote check work unchanged.

.doc is a Compound File ([MS-CFB]) holding the "WordDocument" stream and a table stream;
the text comes from the piece table ([MS-DOC] 2.4.1): the FIB gives where the CLX lies in
the table stream, the CLX lists pieces of text, each one 8-bit (cp1252) or UTF-16.
.docx is a ZIP with word/document.xml ([ECMA-376]), read with defusedxml.

Downloaded files are untrusted: every offset is checked, sector chains are bounded, and a
malformed file raises ``WordError`` instead of looping or reading out of range.
"""

from __future__ import annotations

import io
import re
import struct
import zipfile

from defusedxml import ElementTree

OLE_MAGIC = bytes.fromhex("d0cf11e0a1b11ae1")
_END_OF_CHAIN = 0xFFFFFFFE
_FREE = 0xFFFFFFFF
_MAX_SIZE = 50 * 1024 * 1024


class WordError(ValueError):
    """The file is not a readable Word document."""


def is_doc(content: bytes) -> bool:
    return content[:8] == OLE_MAGIC


def is_docx(content: bytes) -> bool:
    if content[:2] != b"PK":
        return False
    try:
        with zipfile.ZipFile(io.BytesIO(content)) as archive:
            return "word/document.xml" in archive.namelist()
    except zipfile.BadZipFile:
        return False


# --- Compound File Binary ([MS-CFB]) --------------------------------------------------------


class _CompoundFile:
    def __init__(self, data: bytes) -> None:
        if len(data) < 512 or not is_doc(data):
            raise WordError("not an OLE compound file")
        if len(data) > _MAX_SIZE:
            raise WordError("file too large")
        self.data = data
        self.sector_size = 1 << struct.unpack_from("<H", data, 0x1E)[0]
        self.mini_size = 1 << struct.unpack_from("<H", data, 0x20)[0]
        if self.sector_size not in (512, 4096) or self.mini_size != 64:
            raise WordError("unsupported sector size")
        (dir_start,) = struct.unpack_from("<I", data, 0x30)
        (self.cutoff,) = struct.unpack_from("<I", data, 0x38)
        minifat_start, minifat_count, difat_start, difat_count = struct.unpack_from(
            "<IIII", data, 0x3C
        )
        self.max_sectors = (len(data) - 512) // self.sector_size + 1
        self.fat = self._read_fat(difat_start, difat_count)
        self.directory = self._chain_bytes(dir_start)
        self.entries = self._parse_directory()
        root = next((e for e in self.entries if e["type"] == 5), None)
        if root is None:
            raise WordError("no root entry")
        self.mini_stream = self._chain_bytes(root["start"])[: root["size"]]
        self.minifat = (
            list(struct.unpack(f"<{len(b) // 4}I", b))
            if minifat_count and (b := self._chain_bytes(minifat_start))
            else []
        )

    def _sector(self, number: int) -> bytes:
        offset = (number + 1) * self.sector_size
        if number >= self.max_sectors or offset + self.sector_size > len(self.data) + 512:
            raise WordError("sector out of range")
        return self.data[offset : offset + self.sector_size]

    def _read_fat(self, difat_start: int, difat_count: int) -> list[int]:
        ids = [i for i in struct.unpack_from("<109I", self.data, 0x4C) if i < _END_OF_CHAIN]
        per_sector = self.sector_size // 4 - 1
        sector, seen = difat_start, 0
        while sector < _END_OF_CHAIN and seen < difat_count:
            values = struct.unpack(f"<{per_sector + 1}I", self._sector(sector))
            ids += [i for i in values[:per_sector] if i < _END_OF_CHAIN]
            sector, seen = values[per_sector], seen + 1
        fat: list[int] = []
        for sector_id in ids:
            fat += struct.unpack(f"<{self.sector_size // 4}I", self._sector(sector_id))
        return fat

    def _chain(self, start: int, table: list[int]) -> list[int]:
        chain, sector = [], start
        while sector < _END_OF_CHAIN:
            if sector >= len(table) or len(chain) > len(table):
                raise WordError("broken sector chain")
            chain.append(sector)
            sector = table[sector]
        return chain

    def _chain_bytes(self, start: int) -> bytes:
        if start in (_END_OF_CHAIN, _FREE):
            return b""
        return b"".join(self._sector(s) for s in self._chain(start, self.fat))

    def _parse_directory(self) -> list[dict]:
        entries = []
        for offset in range(0, len(self.directory) - 127, 128):
            raw = self.directory[offset : offset + 128]
            (name_len,) = struct.unpack_from("<H", raw, 64)
            kind = raw[66]
            if kind == 0 or name_len < 2 or name_len > 64:
                continue
            name = raw[: name_len - 2].decode("utf-16-le", errors="replace")
            start, size = struct.unpack_from("<II", raw, 116)
            entries.append({"name": name, "type": kind, "start": start, "size": size})
        return entries

    def stream(self, name: str) -> bytes:
        entry = next((e for e in self.entries if e["type"] == 2 and e["name"] == name), None)
        if entry is None:
            raise WordError(f"no stream {name}")
        if entry["size"] > _MAX_SIZE:
            raise WordError("stream too large")
        if entry["size"] < self.cutoff:
            chain = self._chain(entry["start"], self.minifat)
            data = b"".join(
                self.mini_stream[s * self.mini_size : (s + 1) * self.mini_size] for s in chain
            )
        else:
            data = self._chain_bytes(entry["start"])
        if len(data) < entry["size"]:
            raise WordError(f"stream {name} is truncated")
        return data[: entry["size"]]


# --- Word 97-2003 text ([MS-DOC]) -----------------------------------------------------------

_FIB_IDENT = 0xA5EC
_FIELD = re.compile("\x13[^\x13\x14\x15]*(?:\x14([^\x13\x14\x15]*))?\x15")


def _pieces(word: bytes, table: bytes) -> list[tuple[int, int, int, bool]]:
    """(cp_start, cp_end, byte offset in WordDocument, compressed) of every piece."""
    fc_clx, lcb_clx = struct.unpack_from("<II", word, 0x01A2)
    if fc_clx + lcb_clx > len(table) or lcb_clx == 0:
        raise WordError("no piece table")
    clx, pos = table[fc_clx : fc_clx + lcb_clx], 0
    while pos < len(clx) and clx[pos] == 0x01:  # Prc: property modifiers, skipped
        (size,) = struct.unpack_from("<H", clx, pos + 1)
        pos += 3 + size
    if pos >= len(clx) or clx[pos] != 0x02:
        raise WordError("no Pcdt in the piece table")
    (lcb,) = struct.unpack_from("<I", clx, pos + 1)
    plc = clx[pos + 5 : pos + 5 + lcb]
    count = (len(plc) - 4) // 12
    if count <= 0:
        raise WordError("empty piece table")
    cps = struct.unpack_from(f"<{count + 1}I", plc, 0)
    pieces = []
    for i in range(count):
        (fc_raw,) = struct.unpack_from("<I", plc, 4 * (count + 1) + 8 * i + 2)
        compressed = bool(fc_raw & 0x40000000)
        fc = fc_raw & 0x3FFFFFFF
        pieces.append((cps[i], cps[i + 1], fc // 2 if compressed else fc, compressed))
    return pieces


def _clean(text: str) -> str:
    """Word control characters to plain lines; table cells become ' | '."""
    text = _FIELD.sub(lambda m: m.group(1) or "", text)  # keep a field's result, not its code
    text = text.replace("\x07\x07", "\x07\r")  # cell mark + row mark: end of a table row
    text = text.translate({0x07: " | ", 0x0B: "\n", 0x0C: "\n", 0x1E: "-", 0x1F: None,
                           0x01: None, 0x08: None, 0xA0: " "})  # fmt: skip
    lines = []
    for line in text.replace("\r", "\n").split("\n"):
        line = re.sub(r"[ \t]+", " ", line).strip()
        line = re.sub(r"(?:\s*\|\s*)+$", "", line).strip()  # trailing empty cells
        if line.strip(" |"):
            lines.append(line)
    return "\n".join(lines)


def doc_to_text(content: bytes) -> str:
    """Text of a Word 97-2003 document (main text, not headers, footnotes or comments)."""
    try:
        compound = _CompoundFile(content)
        word = compound.stream("WordDocument")
        if len(word) < 0x01AA or struct.unpack_from("<H", word, 0)[0] != _FIB_IDENT:
            raise WordError("not a Word 97-2003 document")
        (flags,) = struct.unpack_from("<H", word, 0x0A)
        if flags & 0x0100:
            raise WordError("the document is encrypted")
        table = compound.stream("1Table" if flags & 0x0200 else "0Table")
        (ccp_text,) = struct.unpack_from("<I", word, 0x004C)
        parts = []
        for cp_start, cp_end, offset, compressed in _pieces(word, table):
            if cp_start >= ccp_text:
                break
            length = min(cp_end, ccp_text) - cp_start
            size = length if compressed else 2 * length
            if length < 0 or offset + size > len(word):
                raise WordError("piece out of range")
            raw = word[offset : offset + size]
            parts.append(raw.decode("cp1252", errors="replace") if compressed
                         else raw.decode("utf-16-le", errors="replace"))  # fmt: skip
    except (struct.error, IndexError) as exc:
        raise WordError(f"malformed Word document: {exc}") from exc
    return _clean("".join(parts))


# --- .docx ([ECMA-376]) ---------------------------------------------------------------------

_W = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"


def _paragraph_text(paragraph) -> str:
    out = []
    for node in paragraph.iter():
        if node.tag == f"{_W}t" and node.text:
            out.append(node.text)
        elif node.tag in (f"{_W}tab",):
            out.append(" ")
        elif node.tag in (f"{_W}br", f"{_W}cr"):
            out.append("\n")
    return "".join(out)


def docx_to_text(content: bytes) -> str:
    """Text of a .docx body: paragraphs as lines, table rows as cells joined with ' | '."""
    try:
        with zipfile.ZipFile(io.BytesIO(content)) as archive:
            info = archive.getinfo("word/document.xml")
            if info.file_size > _MAX_SIZE:
                raise WordError("document.xml too large")
            root = ElementTree.fromstring(archive.read(info))
    except (KeyError, zipfile.BadZipFile, ElementTree.ParseError) as exc:
        raise WordError(f"malformed .docx: {exc}") from exc
    body = root.find(f"{_W}body")
    if body is None:
        raise WordError("no document body")
    lines: list[str] = []
    for block in body:
        if block.tag == f"{_W}p":
            lines += _paragraph_text(block).split("\n")
        elif block.tag == f"{_W}tbl":
            for row in block.iter(f"{_W}tr"):
                cells = [
                    " ".join(_paragraph_text(p) for p in cell.iter(f"{_W}p")).strip()
                    for cell in row.findall(f"{_W}tc")
                ]
                lines.append(" | ".join(cells))
    cleaned = [re.sub(r"\s+", " ", line).strip(" |") for line in lines]
    return "\n".join(line for line in cleaned if line)
