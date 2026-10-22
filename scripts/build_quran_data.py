#!/usr/bin/env python3
"""Build Suly's bundled Quran page index from the verbatim Tanzil source files."""

from __future__ import annotations

import json
import xml.etree.ElementTree as ET
from bisect import bisect_right
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TEXT_PATH = ROOT / "assets/quran/tanzil-uthmani.txt"
METADATA_PATH = ROOT / "assets/quran/quran-data.xml"
OUTPUT_PATH = ROOT / "assets/quran/quran-data.json"

ATTRIBUTION = (
    "Tanzil Quran Text. Copyright (C) 2007-2026 Tanzil Project. "
    "License: Creative Commons Attribution 3.0. This Quran text is carefully "
    "produced, highly verified and continuously monitored by specialists in the "
    "Tanzil Project. Source: https://tanzil.net/ . The Quran text must not be changed."
)


def read_verses() -> list[tuple[int, int, str]]:
    verses: list[tuple[int, int, str]] = []
    for line in TEXT_PATH.read_text(encoding="utf-8").splitlines():
        parts = line.split("|", 2)
        if len(parts) != 3 or not parts[0].isdigit() or not parts[1].isdigit():
            continue
        verses.append((int(parts[0]), int(parts[1]), parts[2]))
    if len(verses) != 6236:
        raise ValueError(f"Expected 6236 verses from Tanzil; found {len(verses)}")
    if len({(sura, aya) for sura, aya, _ in verses}) != 6236:
        raise ValueError("Duplicate verse identifiers found in Tanzil text")
    return verses


def main() -> None:
    verses = read_verses()
    verse_indices = {(sura, aya): i for i, (sura, aya, _) in enumerate(verses)}
    root = ET.parse(METADATA_PATH).getroot()
    suras_node = root.find("suras")
    pages_node = root.find("pages")
    if suras_node is None or pages_node is None:
        raise ValueError("Tanzil metadata is missing the suras or pages section")
    sura_elements = list(suras_node)
    page_elements = list(pages_node)
    if len(sura_elements) != 114 or len(page_elements) != 604:
        raise ValueError(
            f"Expected 114 suras and 604 pages; found {len(sura_elements)} and {len(page_elements)}"
        )

    page_starts: list[int] = []
    for page in page_elements:
        key = (int(page.attrib["sura"]), int(page.attrib["aya"]))
        if key not in verse_indices:
            raise ValueError(f"Page start does not match a verse: {key}")
        page_starts.append(verse_indices[key])
    if page_starts[0] != 0 or page_starts != sorted(set(page_starts)):
        raise ValueError("Tanzil page starts are missing, duplicated, or unordered")

    pages: list[list[list[object]]] = []
    for index, start in enumerate(page_starts):
        end = page_starts[index + 1] if index + 1 < len(page_starts) else len(verses)
        page = [[sura, aya, text] for sura, aya, text in verses[start:end]]
        if not page:
            raise ValueError(f"Empty page in Tanzil metadata: {index + 1}")
        pages.append(page)

    suras: list[dict[str, object]] = []
    for item in sura_elements:
        sura_id = int(item.attrib["index"])
        first_verse = verse_indices[(sura_id, 1)]
        start_page = bisect_right(page_starts, first_verse)
        suras.append(
            {
                "id": sura_id,
                "name": item.attrib["name"],
                "englishName": item.attrib["ename"],
                "verseCount": int(item.attrib["ayas"]),
                "startPage": start_page,
            }
        )

    payload = {
        "metadata": {
            "textSource": "Tanzil Quran Text",
            "textVersion": "1.1",
            "metadataSource": "Tanzil Quran Metadata",
            "metadataVersion": "1.0",
            "license": "Creative Commons Attribution 3.0",
            "sourceUrl": "https://tanzil.net/",
            "licenseUrl": "https://tanzil.net/docs/text_license",
            "attribution": ATTRIBUTION,
            "notice": "The Quran text is reproduced verbatim and must not be changed.",
        },
        "surahs": suras,
        "pages": pages,
    }
    OUTPUT_PATH.write_text(
        json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + "\n",
        encoding="utf-8",
    )
    print(
        f"Built {len(verses)} verses in {len(suras)} surahs and "
        f"{len(pages)} pages: {OUTPUT_PATH} ({OUTPUT_PATH.stat().st_size} bytes)"
    )


if __name__ == "__main__":
    main()
