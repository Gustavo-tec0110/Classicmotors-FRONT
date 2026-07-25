"""Valida sintaxe básica e referências locais dos arquivos HTML."""

from __future__ import annotations

from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parents[1]


class ReferenceParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.references: list[str] = []

    def handle_starttag(self, _tag: str, attrs: list[tuple[str, str | None]]) -> None:
        for name, value in attrs:
            if name in {"href", "src"} and value:
                self.references.append(value)


def local_target(source: Path, reference: str) -> Path | None:
    parsed = urlsplit(reference)
    if parsed.scheme or parsed.netloc or reference.startswith(("#", "data:", "mailto:", "tel:")):
        return None
    clean_path = unquote(parsed.path)
    if not clean_path or clean_path.startswith("/"):
        return None
    return (source.parent / clean_path).resolve()


def main() -> int:
    errors: list[str] = []
    html_files = sorted(ROOT.rglob("*.html"))

    for html_file in html_files:
        parser = ReferenceParser()
        try:
            parser.feed(html_file.read_text(encoding="utf-8"))
        except Exception as error:  # pragma: no cover - mensagem para CI
            errors.append(f"{html_file.relative_to(ROOT)}: HTML inválido ({error})")
            continue

        for reference in parser.references:
            target = local_target(html_file, reference)
            if target and ROOT in target.parents and not target.exists():
                errors.append(
                    f"{html_file.relative_to(ROOT)}: referência ausente {reference}"
                )

    if errors:
        print("\n".join(errors))
        return 1

    print(f"{len(html_files)} arquivos HTML validados.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
