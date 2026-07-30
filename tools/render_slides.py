#!/usr/bin/env python3
"""
Render mỗi trang slide thành một file PNG cho VLearn.

Chạy OFFLINE một lần. Ảnh nằm sẵn trong public/ nên lúc demo trình duyệt chỉ việc
tải <img> — không phải nạp pdf.js và vẽ 58 canvas, không phụ thuộc mạng.

    python tools/render_slides.py
    python tools/render_slides.py --dpi 150     # nét hơn, file nặng hơn

TÊN FILE
    public/slides/<deckId>/p01.png ... p29.png
    Khớp với `imageBasePath` trong slides-<deckId>.json:
        `${deck.imageBasePath}/p${String(page).padStart(2, "0")}.png`

VÌ SAO 110 DPI
    Slide gốc 960x540pt. Ở 110 DPI ra ~1467x825px — đủ nét trên màn Retina khi
    khung xem rộng khoảng 900px, mà mỗi file chỉ vài trăm KB. Trang slide là chữ
    to và hình khối phẳng nên không cần độ phân giải cao như ảnh chụp.
"""

from __future__ import annotations

import argparse
from pathlib import Path

import pymupdf

REPO = Path(__file__).resolve().parent.parent

DECKS = [
    ("day01", REPO / "data/vlearn-pack/slides/d1-slide-hackathon.pdf"),
    ("day02", REPO / "data/vlearn-pack/slides/d2-slide-hackathon.pdf"),
]
OUT_ROOT = REPO / "vlearn-web/public/slides"

DEFAULT_DPI = 110


def render_deck(deck_id: str, source: Path, dpi: int) -> tuple[int, int]:
    out_dir = OUT_ROOT / deck_id
    out_dir.mkdir(parents=True, exist_ok=True)

    total_bytes = 0
    with pymupdf.open(source) as doc:
        for index, page in enumerate(doc, start=1):
            pixmap = page.get_pixmap(dpi=dpi)
            target = out_dir / f"p{index:02d}.png"
            pixmap.save(target)
            total_bytes += target.stat().st_size
        return len(doc), total_bytes


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dpi", type=int, default=DEFAULT_DPI)
    args = parser.parse_args()

    for deck_id, source in DECKS:
        if not source.exists():
            raise SystemExit(f"Không tìm thấy {source}")

        pages, size = render_deck(deck_id, source, args.dpi)
        print(
            f"  vlearn-web/public/slides/{deck_id}/  "
            f"{pages} ảnh · {size / 1024 / 1024:.1f} MB · {args.dpi} DPI"
        )


if __name__ == "__main__":
    main()
