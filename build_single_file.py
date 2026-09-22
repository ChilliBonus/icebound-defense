#!/usr/bin/env python3
"""Build Icebound as one self-contained HTML file using only the stdlib."""

from __future__ import annotations

import base64
import json
import mimetypes
import re
import sys
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit


PROJECT_DIR = Path(__file__).resolve().parent
SOURCE_HTML = PROJECT_DIR / "index.html"
OUTPUT_HTML = PROJECT_DIR / "dist" / "icebound.html"
# Markiert den Build fuer pwa.js: hier gibt es keine separate service-worker.js,
# egal ueber welches Protokoll die Datei spaeter ausgeliefert wird.
SINGLE_FILE_MARKER = "<script>globalThis.__ICEBOUND_SINGLE_FILE__=true;</script>"
HEAD_RE = re.compile(r"<head\b[^>]*>", re.IGNORECASE)
TAG_RE = re.compile(r"<(?:link|script)\b[^>]*>(?:\s*</script\s*>)?", re.IGNORECASE)
CSS_URL_RE = re.compile(r"url\(\s*(['\"]?)(.*?)\1\s*\)", re.IGNORECASE)


class TagAttributes(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.tag = ""
        self.attrs: dict[str, str] = {}

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        self.tag = tag
        self.attrs = {name.lower(): value or "" for name, value in attrs}

    handle_startendtag = handle_starttag


def fail(message: str) -> "NoReturn":
    raise RuntimeError(message)


def parse_tag(source: str) -> tuple[str, dict[str, str]]:
    parser = TagAttributes()
    parser.feed(source)
    return parser.tag, parser.attrs


def local_path(url: str, base_dir: Path) -> Path:
    parts = urlsplit(url)
    if parts.scheme or parts.netloc or not parts.path:
        fail(f"Nicht-lokale oder leere Referenz kann nicht eingebettet werden: {url!r}")
    candidate = (base_dir / unquote(parts.path)).resolve()
    try:
        candidate.relative_to(PROJECT_DIR)
    except ValueError:
        fail(f"Referenz liegt ausserhalb des Projekts: {url!r}")
    if not candidate.is_file():
        fail(f"Referenzierte Datei fehlt: {url!r}")
    return candidate


def data_url(path: Path) -> str:
    mime = mimetypes.guess_type(path.name)[0] or "application/octet-stream"
    payload = base64.b64encode(path.read_bytes()).decode("ascii")
    return f"data:{mime};base64,{payload}"


def inline_css_urls(css: str, stylesheet: Path) -> str:
    def replace(match: re.Match[str]) -> str:
        url = match.group(2).strip()
        if not url or url.startswith(("data:", "#")):
            return match.group(0)
        return f'url("{data_url(local_path(url, stylesheet.parent))}")'

    return CSS_URL_RE.sub(replace, css)


def inline_manifest(path: Path) -> str:
    manifest = json.loads(path.read_text(encoding="utf-8"))
    for icon in manifest.get("icons", []):
        source = icon.get("src")
        if source and not source.startswith("data:"):
            icon["src"] = data_url(local_path(source, path.parent))
    compact = json.dumps(manifest, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
    return "data:application/manifest+json;base64," + base64.b64encode(compact).decode("ascii")


def replace_attribute(tag: str, name: str, value: str) -> str:
    pattern = re.compile(rf"(\b{re.escape(name)}\s*=\s*)(['\"])(.*?)\2", re.IGNORECASE)
    replaced, count = pattern.subn(lambda match: f'{match.group(1)}"{value}"', tag, count=1)
    if count != 1:
        fail(f"Attribut {name!r} konnte nicht ersetzt werden: {tag[:120]}")
    return replaced


def inline_tag(match: re.Match[str]) -> str:
    source = match.group(0)
    tag, attrs = parse_tag(source)
    if tag == "script" and "src" in attrs:
        path = local_path(attrs["src"], PROJECT_DIR)
        script = path.read_text(encoding="utf-8").replace("</script", "<\\/script")
        return f"<script>\n{script}\n</script>"
    if tag != "link" or "href" not in attrs:
        return source

    relations = {item.lower() for item in attrs.get("rel", "").split()}
    path = local_path(attrs["href"], PROJECT_DIR)
    if "stylesheet" in relations:
        css = inline_css_urls(path.read_text(encoding="utf-8"), path)
        return f"<style>\n{css}\n</style>"
    if "manifest" in relations:
        return replace_attribute(source, "href", inline_manifest(path))
    if relations.intersection({"icon", "apple-touch-icon"}):
        return replace_attribute(source, "href", data_url(path))
    fail(f"Lokaler <link> wird nicht unterstuetzt: {attrs['href']!r}")


def validate(html: str) -> None:
    problems: list[str] = []
    for match in re.finditer(r"<(?!/?(?:script|style)\b)[^>]+>", html, re.IGNORECASE):
        tag, attrs = parse_tag(match.group(0))
        for name in ("src", "href"):
            value = attrs.get(name, "").strip()
            if value and not value.startswith(("data:", "#")):
                problems.append(f"<{tag}> {name}={value!r}")
    if re.search(r"(?:^|[\"'(])icons/", html, re.IGNORECASE):
        problems.append("verbliebener icons/-Pfad")
    for style in re.findall(r"<style\b[^>]*>(.*?)</style\s*>", html, re.IGNORECASE | re.DOTALL):
        for match in CSS_URL_RE.finditer(style):
            value = match.group(2).strip()
            if value and not value.startswith(("data:", "#")):
                problems.append(f"CSS url({value!r})")
    if problems:
        fail("Build enthaelt externe Referenzen:\n- " + "\n- ".join(problems[:20]))


def main() -> int:
    try:
        source = SOURCE_HTML.read_text(encoding="utf-8")
        result = TAG_RE.sub(inline_tag, source)
        result, marked = HEAD_RE.subn(lambda m: m.group(0) + SINGLE_FILE_MARKER, result, count=1)
        if marked != 1:
            fail("Kein <head> gefunden, Single-File-Marker konnte nicht gesetzt werden")
        validate(result)
        OUTPUT_HTML.parent.mkdir(parents=True, exist_ok=True)
        OUTPUT_HTML.write_text(result, encoding="utf-8")
    except (OSError, ValueError, json.JSONDecodeError, RuntimeError) as error:
        print(f"Fehler: {error}", file=sys.stderr)
        return 1

    print(f"Erzeugt: {OUTPUT_HTML} ({OUTPUT_HTML.stat().st_size:,} Bytes)")
    print("Pruefung: keine externen src=/href=-Referenzen oder icons/-Pfade gefunden")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
