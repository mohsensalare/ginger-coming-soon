#!/usr/bin/env python3
"""Build Ginger's static site with deployment-specific SEO URLs (stdlib only)."""

from __future__ import annotations

import argparse
from datetime import datetime, timezone
from html.parser import HTMLParser
from ipaddress import ip_address
import json
from pathlib import Path
import re
import shutil
import sys
from urllib.parse import quote, unquote, urlsplit


ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "site"
DESTINATION = ROOT / "dist"
TEXT_EXTENSIONS = {".html", ".css", ".js", ".json", ".svg", ".xml", ".txt", ".webmanifest"}
PLACEHOLDER = re.compile(r"__[A-Z][A-Z0-9_]*__")
CSS_URL = re.compile(r"url\(\s*['\"]?([^'\")]+)['\"]?\s*\)")
MAX_SITE_BYTES = 20 * 1024 * 1024


def site_url(raw: str) -> str:
    """Accept one HTTPS origin and optional project path; return no trailing slash."""
    if not raw or any(ch.isspace() or ord(ch) < 32 for ch in raw):
        raise ValueError("--site-url must be a nonempty HTTPS URL without whitespace")
    if "?" in raw or "#" in raw or "\\" in raw:
        raise ValueError("--site-url cannot contain a query, fragment, or backslash")
    parsed = urlsplit(raw)
    if parsed.scheme != "https" or not parsed.hostname or parsed.username is not None or parsed.password is not None:
        raise ValueError("--site-url must use HTTPS and cannot contain credentials")
    try:
        port = parsed.port
        hostname = parsed.hostname.encode("idna").decode("ascii").lower()
    except (ValueError, UnicodeError) as error:
        raise ValueError("--site-url has an invalid hostname or port") from error
    if ":" in hostname:
        try:
            ip_address(hostname)
        except ValueError as error:
            raise ValueError("--site-url has an invalid IP address") from error
        hostname = f"[{hostname}]"
    elif not re.fullmatch(r"(?=.{1,253}\.?$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)*[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.?", hostname):
        raise ValueError("--site-url has an invalid hostname")
    authority = hostname + (f":{port}" if port else "")
    path = quote(parsed.path.rstrip("/"), safe="/-._~!$()*+,;=:@%")
    if any(segment in {".", ".."} for segment in unquote(path).split("/")):
        raise ValueError("--site-url path cannot contain dot segments")
    if re.search(r"%(?![0-9A-Fa-f]{2})", path):
        raise ValueError("--site-url has an invalid percent escape")
    return f"https://{authority}{path}"


class Page(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.references: list[str] = []
        self.canonical: str | None = None
        self.metadata: dict[str, str] = {}
        self.lang: str | None = None
        self.h1_count = 0
        self.has_title = False
        self.jsonld: list[str] = []
        self._in_jsonld = False

    def handle_starttag(self, tag: str, attributes: list[tuple[str, str | None]]) -> None:
        attrs = dict(attributes)
        if tag == "html":
            self.lang = attrs.get("lang")
        elif tag == "title":
            self.has_title = True
        elif tag == "h1":
            self.h1_count += 1
        elif tag == "meta":
            key = attrs.get("name") or attrs.get("property")
            if key:
                self.metadata[key] = attrs.get("content") or ""
        elif tag == "link" and attrs.get("rel") == "canonical":
            self.canonical = attrs.get("href")
        elif tag == "script" and attrs.get("type") == "application/ld+json":
            self._in_jsonld = True
            self.jsonld.append("")
        for key in ("src", "href", "poster"):
            if attrs.get(key):
                self.references.append(attrs[key])  # type: ignore[arg-type]
        if attrs.get("srcset"):
            self.references.extend(part.strip().split()[0] for part in attrs["srcset"].split(",") if part.strip())
        if attrs.get("style"):
            self.references.extend(CSS_URL.findall(attrs["style"]))

    def handle_endtag(self, tag: str) -> None:
        if tag == "script":
            self._in_jsonld = False

    def handle_data(self, data: str) -> None:
        if self._in_jsonld:
            self.jsonld[-1] += data


def validate_reference(reference: str, owner: Path, home: str) -> None:
    """Check local HTML/CSS assets without fetching external URLs."""
    if reference.startswith(home):
        local = DESTINATION / unquote(reference[len(home):].split("#", 1)[0].split("?", 1)[0])
    else:
        parsed = urlsplit(reference)
        if parsed.scheme or parsed.netloc or not parsed.path:
            return
        if parsed.path.startswith("/"):
            raise ValueError(f"Use relative asset paths for project Pages: {owner.name}: {reference}")
        local = owner.parent / unquote(parsed.path)
    if not local.resolve().is_relative_to(DESTINATION.resolve()):
        raise ValueError(f"Asset path escapes dist: {reference}")
    if not local.exists():
        raise ValueError(f"Missing local reference in {owner.relative_to(DESTINATION)}: {reference}")


def build(base_url: str, og_image: str) -> None:
    home = base_url + "/"
    if not SOURCE.is_dir() or not (SOURCE / "index.html").is_file():
        raise ValueError("site/index.html is required")
    og_path = Path(og_image)
    if og_path.is_absolute() or ".." in og_path.parts or not (SOURCE / og_path).is_file():
        raise ValueError("--og-image must name an existing file inside site/")
    entries = list(SOURCE.rglob("*"))
    if any(entry.is_symlink() for entry in entries) or SOURCE.is_symlink():
        raise ValueError("site/ cannot contain symlinks")
    total = sum(entry.stat().st_size for entry in entries if entry.is_file())
    if total > MAX_SITE_BYTES:
        raise ValueError(f"Site exceeds the 20 MiB landing-page budget: {total:,} bytes")
    if DESTINATION.is_symlink():
        raise ValueError("dist/ cannot be a symlink")
    if DESTINATION.exists():
        shutil.rmtree(DESTINATION)
    shutil.copytree(SOURCE, DESTINATION)
    substitutions = {
        "__SITE_URL__": base_url,
        "__SITE_HOME__": home,
        "__OG_IMAGE_URL__": home + quote(og_path.as_posix()),
        "__BUILD_YEAR__": str(datetime.now(timezone.utc).year),
    }
    for path in DESTINATION.rglob("*"):
        if path.is_file() and path.suffix.lower() in TEXT_EXTENSIONS:
            content = path.read_text(encoding="utf-8")
            for token, value in substitutions.items():
                content = content.replace(token, value)
            if unknown := PLACEHOLDER.findall(content):
                raise ValueError(f"Unresolved placeholder in {path.name}: {', '.join(sorted(set(unknown)))}")
            path.write_text(content, encoding="utf-8")
    (DESTINATION / ".nojekyll").touch()
    # Let crawlers read the HTML noindex directive; do not advertise a sitemap yet.
    (DESTINATION / "robots.txt").write_text("User-agent: *\nAllow: /\n", encoding="utf-8")
    (DESTINATION / "sitemap.xml").write_text(
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
        "</urlset>\n",
        encoding="utf-8",
    )
    main = Page()
    main.feed((DESTINATION / "index.html").read_text(encoding="utf-8"))
    if not main.lang or not main.has_title or main.h1_count != 1:
        raise ValueError("index.html must have lang, title, and exactly one h1")
    if not main.metadata.get("description"):
        raise ValueError("index.html needs a meta description")
    robots_directives = set(re.split(r"[,\s]+", main.metadata.get("robots", "").lower()))
    if "noindex" not in robots_directives or "index" in robots_directives or "all" in robots_directives:
        raise ValueError("Indexing is disabled: index.html must contain an unambiguous robots noindex directive")
    if main.canonical != home or main.metadata.get("og:url") != home:
        raise ValueError("Canonical and og:url must equal __SITE_HOME__")
    if main.metadata.get("og:image") != substitutions["__OG_IMAGE_URL__"]:
        raise ValueError("og:image must use __OG_IMAGE_URL__")
    if not main.jsonld:
        raise ValueError("index.html needs JSON-LD structured data")
    for structured_data in main.jsonld:
        json.loads(structured_data)
    for path in DESTINATION.rglob("*"):
        if path.suffix == ".html":
            page = Page()
            page.feed(path.read_text(encoding="utf-8"))
            for reference in page.references:
                validate_reference(reference, path, home)
        elif path.suffix == ".css":
            for reference in CSS_URL.findall(path.read_text(encoding="utf-8")):
                validate_reference(reference, path, home)
    print(f"Built and validated {home} → dist/ ({total:,} source bytes)")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--site-url", required=True, help="Final HTTPS URL, including any GitHub project path")
    parser.add_argument("--og-image", default="assets/og-image.jpg", help="Image path relative to site/")
    args = parser.parse_args()
    try:
        build(site_url(args.site_url), args.og_image)
    except (ValueError, OSError, json.JSONDecodeError) as error:
        print(f"Build failed: {error}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
