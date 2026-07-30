"""Add normalized PDF word coordinates to the preloaded Day 1 / Day 2 JSON artifacts."""

import json
from pathlib import Path

import pdfplumber


ROOT = Path(__file__).resolve().parents[1]
SOURCES = (
    (Path.home() / "Downloads" / "d1-slide-hackathon.pdf", ROOT / "data" / "slides-day01.json"),
    (Path.home() / "Downloads" / "d2-slide-hackathon.pdf", ROOT / "data" / "slides-day02.json"),
)


def normalized(value: float, size: float) -> float:
    return round(max(0, min(1, value / size)), 6)


def main() -> None:
    for pdf_path, artifact_path in SOURCES:
        artifact = json.loads(artifact_path.read_text(encoding="utf-8"))
        with pdfplumber.open(pdf_path) as pdf:
            if len(pdf.pages) != len(artifact["pages"]):
                raise ValueError(f"Page count mismatch: {pdf_path.name}")
            for record, page in zip(artifact["pages"], pdf.pages, strict=True):
                spans = []
                for word in page.extract_words(use_text_flow=False, keep_blank_chars=False):
                    text = word["text"].strip()
                    if text:
                        spans.append({
                            "text": text,
                            "x": normalized(word["x0"], page.width),
                            "y": normalized(word["top"], page.height),
                            "width": normalized(word["x1"] - word["x0"], page.width),
                            "height": normalized(word["bottom"] - word["top"], page.height),
                        })
                record["textSpans"] = spans
        artifact_path.write_text(json.dumps(artifact, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print(f"{artifact_path.name}: {sum(len(page['textSpans']) for page in artifact['pages'])} spans")


if __name__ == "__main__":
    main()
