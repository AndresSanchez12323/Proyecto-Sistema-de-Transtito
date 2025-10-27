from __future__ import annotations

from pathlib import Path

from pypdf import PdfReader


def extract_text(pdf_path: str | Path) -> None:
    path = Path(pdf_path)
    reader = PdfReader(str(path))
    for idx, page in enumerate(reader.pages, start=1):
        print(f"--- PAGE {idx} ---")
        text = page.extract_text() or "[NO TEXT FOUND]"
        print(text)
        print()


if __name__ == "__main__":
    extract_text(r"c:\Users\edwin_ib91qce\Downloads\Sistema Transito - E-R (Barker).pdf")
