#!/usr/bin/env python3
"""
Trích xuất nội dung bộ slide bài giảng thành JSON nạp sẵn cho VLearn.

Chạy OFFLINE một lần, không chạy lúc demo (spec.md §4 — nạp sẵn, không parse PDF runtime).
Đầu ra khớp type `SlideDeck` trong vlearn-web/lib/types.ts.

    python tools/extract_slides.py
    python tools/extract_slides.py --report      # in thêm bản kê ký tự đã loại

VÌ SAO PHẢI LỌC
    Bản slide hackathon có watermark "HACKATHON - AI IN ACTION" in chéo trên mọi trang.
    pdfplumber đọc watermark như text bình thường và trộn từng ký tự vào giữa nội dung:

        AI IN ACTION  Day 1
        N
        O
        H            <- watermark, đọc ngược là "...KATHON"
        T
        AI & LLM Foundation C
        A
        H

    Đổ nguyên văn này vào Gemini là mỗi trang đều nhiễm rác.

CÁCH LỌC
    Không đoán theo cỡ chữ (tiêu đề slide 40pt và watermark 48pt quá gần nhau).
    Dùng tính LẶP LẠI: watermark nằm ở đúng một vị trí trên mọi trang, còn nội dung
    bài giảng thì không. Nên quy tắc là:

        loại ký tự xuất hiện ở CÙNG MỘT Ô TOẠ ĐỘ trên >= REPEAT_THRESHOLD số trang

    Trên dữ liệu thật quy tắc này bắt đúng 20 ô watermark ở cả hai bộ, cộng thêm
    footer "DAY02 · 03/8" của Day 2 — đều là thứ không thuộc nội dung bài giảng.
    Chạy với --report để xem chính xác những gì bị loại.
"""

from __future__ import annotations

import argparse
import json
import re
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

import pdfplumber

REPO = Path(__file__).resolve().parent.parent

DECKS = [
    {
        "deckId": "day01",
        "title": "Day 1 — AI & LLM Foundation",
        "source": REPO / "data/vlearn-pack/slides/d1-slide-hackathon.pdf",
    },
    {
        "deckId": "day02",
        "title": "Day 2 — Xác định bài toán cho AI",
        "source": REPO / "data/vlearn-pack/slides/d2-slide-hackathon.pdf",
    },
]
OUT_DIR = REPO / "vlearn-web/data"

# Ô toạ độ 4pt — đủ rộng để chịu sai số làm tròn, đủ hẹp để không gộp nhầm hai ký tự khác nhau.
POS_BUCKET = 4
# Xuất hiện trên >= 80% số trang thì coi là phần tử lặp (watermark / header / footer).
REPEAT_THRESHOLD = 0.8
# Dưới ngưỡng này coi như trang không đủ chữ để tóm tắt -> hasText = False.
# Trên 2 bộ slide hiện tại KHÔNG trang nào rơi vào đây (trang ít chữ nhất có 134 ký tự).
MIN_CHARS_FOR_TEXT = 20


def slot(char: dict) -> tuple:
    """Ô toạ độ của một ký tự — dùng để đối chiếu giữa các trang."""
    return (
        char["text"],
        round(char["x0"] / POS_BUCKET),
        round(char["top"] / POS_BUCKET),
    )


def find_repeated_slots(pdf) -> set:
    """Tìm các ô xuất hiện trên hầu hết các trang. Đó là watermark/header/footer."""
    seen = Counter()
    for page in pdf.pages:
        # set() để một trang chỉ đóng góp 1 phiếu cho mỗi ô
        seen.update({slot(c) for c in page.chars if c["text"].strip()})
    floor = len(pdf.pages) * REPEAT_THRESHOLD
    return {s for s, n in seen.items() if n >= floor}


def clean(text: str) -> str:
    """Bỏ ký tự icon-font (Private Use Area) và gộp khoảng trắng thừa."""
    text = "".join(" " if 0xE000 <= ord(ch) <= 0xF8FF else ch for ch in text)
    lines = [re.sub(r"[ \t]+", " ", ln).strip() for ln in text.splitlines()]
    return "\n".join(ln for ln in lines if ln)


def extract_page(page, repeated: set) -> tuple[str, dict]:
    """Trích text của một trang sau khi bỏ các ô lặp."""
    kept = page.filter(
        lambda obj: obj.get("object_type") != "char" or slot(obj) not in repeated
    )
    text = clean(kept.extract_text() or "")
    area = max(1.0, float(page.width) * float(page.height))
    meta = {
        "charCount": len(text),
        "imageCount": len(page.images),
        "textDensity": round(len(text) / area * 1000, 3),
    }
    return text, meta


def build_chunks(pages: list[dict]) -> list[dict]:
    """
    1 chunk = 1 trang.

    Chọn vậy vì chiều chất lượng số 1 ở spec §7 là Citation Accuracy: mỗi ý tóm tắt
    phải trỏ đúng trang. Gộp nhiều trang vào một chunk là mở đường cho chính lỗi
    "trích dẫn nhảy trang" mà §3 đã ghi nhận ở NotebookLM.

    Đổi chiến lược sau chỉ cần sửa hàm này — cấu trúc SlideChunk đã cho phép nhiều trang.
    """
    return [
        {
            "chunkId": f"c{p['page']:03d}",
            "pages": [p["page"]],
            "text": p["text"],
        }
        for p in pages
        if p["hasText"]
    ]


def extract_deck(deck: dict, report: bool) -> dict:
    with pdfplumber.open(deck["source"]) as pdf:
        repeated = find_repeated_slots(pdf)

        pages = []
        for index, page in enumerate(pdf.pages, start=1):
            text, meta = extract_page(page, repeated)
            pages.append(
                {
                    "page": index,
                    "text": text,
                    "hasText": meta["charCount"] >= MIN_CHARS_FOR_TEXT,
                    "meta": meta,
                }
            )

        # Ghép các ký tự bị loại theo thứ tự đọc để người kiểm tra thấy nó là gì.
        removed = "".join(
            ch for ch, _, _ in sorted(repeated, key=lambda s: (s[2], s[1]))
        )

        if report:
            print(f"\n  [{deck['deckId']}] loại {len(repeated)} ô lặp:")
            for ch, x, t in sorted(repeated, key=lambda s: (s[2], s[1])):
                print(f"      '{ch}'  x≈{x * POS_BUCKET:<4} top≈{t * POS_BUCKET}")

        return {
            "deckId": deck["deckId"],
            "title": deck["title"],
            "totalPages": len(pages),
            "imageBasePath": f"/slides/{deck['deckId']}",
            "pages": pages,
            "chunks": build_chunks(pages),
            "extraction": {
                "sourceFile": deck["source"].name,
                "extractedAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
                "tool": f"pdfplumber {pdfplumber.__version__}",
                "removedRepeatedText": removed,
                "removedSlotCount": len(repeated),
                "chunkStrategy": "1 chunk = 1 trang",
            },
        }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--report", action="store_true", help="in bản kê ký tự đã loại")
    args = parser.parse_args()

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    for deck in DECKS:
        if not deck["source"].exists():
            raise SystemExit(f"Không tìm thấy {deck['source']}")

        data = extract_deck(deck, args.report)
        out = OUT_DIR / f"slides-{deck['deckId']}.json"
        out.write_text(
            json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
        )

        chars = sum(p["meta"]["charCount"] for p in data["pages"])
        thin = [p["page"] for p in data["pages"] if not p["hasText"]]
        print(
            f"  {out.relative_to(REPO)}\n"
            f"      {data['totalPages']} trang · {len(data['chunks'])} chunk · {chars:,} ký tự\n"
            f"      đã loại: {data['extraction']['removedRepeatedText']!r}\n"
            f"      trang không đủ chữ: {thin or 'không có'}"
        )


if __name__ == "__main__":
    main()
