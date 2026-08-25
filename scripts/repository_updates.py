#!/usr/bin/env python3
"""Send one Buttondown announcement when repository.html lists new papers."""

from __future__ import annotations

import argparse
from dataclasses import dataclass
import hashlib
import html
from html.parser import HTMLParser
import json
import os
from pathlib import Path, PurePosixPath
import re
import subprocess
import sys
import time
from typing import Any
import urllib.error
import urllib.parse
import urllib.request


REPOSITORY_URL = "https://yangpliu.github.io/repository.html"
BUTTONDOWN_API_URL = "https://api.buttondown.com/v1"
BUTTONDOWN_API_VERSION = "2026-04-01"
BUTTONDOWN_MAX_ATTEMPTS = 4
BUTTONDOWN_MAX_RETRY_SECONDS = 60.0
ENTRY_RE = re.compile(
    r'<li>\s*<details class="paper-entry">(?P<body>.*?)</details>\s*</li>',
    re.DOTALL,
)
TITLE_RE = re.compile(
    r'<span class="paper-title">(?P<title>.*?)</span>',
    re.DOTALL,
)
PDF_RE = re.compile(r'<a class="paper-pdf" href="(?P<href>[^"]+)">PDF</a>')
FULL_SHA_RE = re.compile(r"[0-9a-f]{40}")


class UpdateError(RuntimeError):
    """A safe, user-facing notification failure."""


class _TextExtractor(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.parts: list[str] = []

    def handle_data(self, data: str) -> None:
        self.parts.append(data)


def _plain_text(fragment: str) -> str:
    parser = _TextExtractor()
    parser.feed(fragment)
    parser.close()
    return " ".join("".join(parser.parts).split())


@dataclass(frozen=True)
class Paper:
    title: str
    pdf_href: str

    @property
    def slug(self) -> str:
        return PurePosixPath(self.pdf_href).parts[1]

    @property
    def pdf_url(self) -> str:
        return urllib.parse.urljoin(REPOSITORY_URL, self.pdf_href)


def parse_papers(source: str) -> list[Paper]:
    papers: list[Paper] = []
    seen_hrefs: set[str] = set()
    for entry_match in ENTRY_RE.finditer(source):
        entry = entry_match.group("body")
        title_match = TITLE_RE.search(entry)
        pdf_match = PDF_RE.search(entry)
        if title_match is None or pdf_match is None:
            raise UpdateError("repository.html contains a malformed paper entry")
        title = _plain_text(title_match.group("title"))
        pdf_href = html.unescape(pdf_match.group("href"))
        parts = PurePosixPath(pdf_href).parts
        if (
            len(parts) != 3
            or parts[0] != "repo"
            or not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9._-]*", parts[1])
            or parts[2] != "paper.pdf"
        ):
            raise UpdateError(f"repository.html has an unsafe paper PDF link: {pdf_href}")
        if not title:
            raise UpdateError(f"repository.html has an empty title for {pdf_href}")
        if pdf_href in seen_hrefs:
            raise UpdateError(f"repository.html lists the same paper twice: {pdf_href}")
        seen_hrefs.add(pdf_href)
        papers.append(Paper(title=title, pdf_href=pdf_href))
    if not papers:
        raise UpdateError("repository.html does not contain any paper entries")
    return papers


def find_new_papers(before_source: str | None, after_source: str) -> list[Paper]:
    """Return newly listed PDFs in their current page order.

    A missing pre-push page is treated as initial setup and never triggers a
    back-catalog announcement.
    """

    after = parse_papers(after_source)
    if before_source is None:
        return []
    before_hrefs = {paper.pdf_href for paper in parse_papers(before_source)}
    return [paper for paper in after if paper.pdf_href not in before_hrefs]


def load_repository_at_ref(repository_root: Path, ref: str) -> str | None:
    if ref == "0" * 40:
        return None
    if FULL_SHA_RE.fullmatch(ref) is None:
        raise UpdateError("the pre-push Git revision is not a full SHA")
    result = subprocess.run(
        ["git", "show", f"{ref}:repository.html"],
        cwd=repository_root,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        check=False,
    )
    if result.returncode != 0:
        detail = result.stderr.decode("utf-8", errors="replace").strip()[:500]
        raise UpdateError(f"could not read repository.html at {ref}: {detail}")
    return result.stdout.decode("utf-8")


def announcement_key(papers: list[Paper]) -> str:
    stable_input = "\n".join(sorted(paper.pdf_href for paper in papers)).encode("utf-8")
    return hashlib.sha256(stable_input).hexdigest()


def _markdown_text(value: str) -> str:
    return re.sub(r"([\\`*_\[\]<>])", r"\\\1", value)


def announcement_content(papers: list[Paper]) -> tuple[str, str]:
    if not papers:
        raise UpdateError("cannot compose an announcement without a paper")
    if len(papers) == 1:
        subject = f"New repository paper: {papers[0].title}"
        opening = "A new paper has been added to the Repository."
    else:
        subject = f"{len(papers)} new repository papers"
        opening = f"{len(papers)} new papers have been added to the Repository."
    sections = [opening]
    for paper in papers:
        sections.append(f"**{_markdown_text(paper.title)}**\n\n[Read the paper]({paper.pdf_url})")
    sections.append(f"[Browse the Repository]({REPOSITORY_URL})")
    return subject, "\n\n".join(sections)


def wait_until_published(
    papers: list[Paper],
    after_ref: str,
    *,
    timeout_seconds: int = 600,
    interval_seconds: int = 15,
) -> None:
    if FULL_SHA_RE.fullmatch(after_ref) is None:
        raise UpdateError("the published Git revision is not a full SHA")
    deadline = time.monotonic() + timeout_seconds
    last_error = "the deployed page did not contain the new paper links"
    query = urllib.parse.urlencode({"repository-update": after_ref})
    url = f"{REPOSITORY_URL}?{query}"
    while True:
        try:
            request = urllib.request.Request(
                url,
                headers={"User-Agent": "yangpliu-repository-updates/1"},
            )
            with urllib.request.urlopen(request, timeout=30) as response:
                deployed = response.read().decode("utf-8")
            missing = [paper.pdf_href for paper in papers if f'href="{paper.pdf_href}"' not in deployed]
            if not missing:
                return
            last_error = "the deployed page is still missing: " + ", ".join(missing)
        except (OSError, UnicodeError, urllib.error.URLError) as exc:
            last_error = str(exc)
        if time.monotonic() >= deadline:
            raise UpdateError(f"publication was not visible before the notification timeout: {last_error}")
        time.sleep(interval_seconds)


def _buttondown_request(
    method: str,
    path: str,
    token: str,
    payload: dict[str, Any],
    idempotency_key: str,
) -> dict[str, Any]:
    request_data = json.dumps(payload).encode("utf-8")
    for attempt in range(BUTTONDOWN_MAX_ATTEMPTS):
        request = urllib.request.Request(
            f"{BUTTONDOWN_API_URL}{path}",
            data=request_data,
            method=method,
            headers={
                "Authorization": f"Token {token}",
                "Content-Type": "application/json",
                "User-Agent": "yangpliu-repository-updates/1",
                "X-API-Version": BUTTONDOWN_API_VERSION,
                "X-Idempotency-Key": idempotency_key,
            },
        )
        try:
            with urllib.request.urlopen(request, timeout=45) as response:
                raw = response.read()
        except urllib.error.HTTPError as exc:
            detail = exc.read().decode("utf-8", errors="replace")[:1000]
            retryable = exc.code == 429 or 500 <= exc.code <= 599
            if retryable and attempt + 1 < BUTTONDOWN_MAX_ATTEMPTS:
                retry_after = exc.headers.get("Retry-After") if exc.headers else None
                time.sleep(_retry_delay(attempt, retry_after))
                continue
            raise UpdateError(
                f"Buttondown API {method} {path} failed ({exc.code}): {detail}"
            ) from exc
        except (OSError, urllib.error.URLError) as exc:
            if attempt + 1 < BUTTONDOWN_MAX_ATTEMPTS:
                time.sleep(_retry_delay(attempt))
                continue
            raise UpdateError(f"Buttondown API {method} {path} failed: {exc}") from exc
        try:
            value = json.loads(raw)
        except json.JSONDecodeError as exc:
            raise UpdateError("Buttondown returned a non-JSON response") from exc
        if not isinstance(value, dict):
            raise UpdateError("Buttondown returned an unexpected response")
        return value
    raise AssertionError("the Buttondown retry loop did not return or raise")


def _retry_delay(attempt: int, retry_after: str | None = None) -> float:
    if retry_after is not None:
        try:
            requested = float(retry_after)
        except ValueError:
            pass
        else:
            if requested >= 0:
                return min(requested, BUTTONDOWN_MAX_RETRY_SECONDS)
    return min(float(2**attempt), BUTTONDOWN_MAX_RETRY_SECONDS)


def send_announcement(papers: list[Paper], token: str) -> str:
    token = token.strip()
    if not token:
        raise UpdateError("the BUTTONDOWN_API_KEY GitHub secret is not configured")
    subject, body = announcement_content(papers)
    key = announcement_key(papers)
    draft = _buttondown_request(
        "POST",
        "/emails",
        token,
        {
            "subject": subject,
            "body": body,
            "status": "draft",
            "archival_mode": "disabled",
        },
        f"repository-draft-{key}",
    )
    email_id = str(draft.get("id") or "")
    if not re.fullmatch(r"[A-Za-z0-9_-]+", email_id):
        raise UpdateError("Buttondown did not return a valid email ID")
    _buttondown_request(
        "PATCH",
        f"/emails/{email_id}",
        token,
        {"status": "about_to_send"},
        f"repository-send-{key}",
    )
    return email_id


def notify_from_push(args: argparse.Namespace) -> dict[str, Any]:
    repository_root = Path(args.repository_root).resolve()
    repository_html = (repository_root / args.repository_html).resolve()
    try:
        repository_html.relative_to(repository_root)
    except ValueError as exc:
        raise UpdateError("repository.html must stay inside the repository root") from exc
    before_source = load_repository_at_ref(repository_root, args.before_ref)
    after_source = repository_html.read_text(encoding="utf-8")
    papers = find_new_papers(before_source, after_source)
    if not papers:
        return {"new_papers": [], "sent": False}
    for paper in papers:
        if not (repository_root / PurePosixPath(paper.pdf_href)).is_file():
            raise UpdateError(f"the newly listed PDF does not exist: {paper.pdf_href}")
    result: dict[str, Any] = {
        "new_papers": [paper.pdf_href for paper in papers],
        "sent": False,
    }
    if args.dry_run:
        return result
    wait_until_published(
        papers,
        args.after_ref,
        timeout_seconds=args.wait_seconds,
        interval_seconds=args.poll_seconds,
    )
    email_id = send_announcement(papers, os.environ.get(args.api_key_env, ""))
    result.update({"sent": True, "email_id": email_id})
    return result


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repository-root", default=".")
    parser.add_argument("--repository-html", default="repository.html")
    parser.add_argument("--before-ref", required=True)
    parser.add_argument("--after-ref", required=True)
    parser.add_argument("--api-key-env", default="BUTTONDOWN_API_KEY")
    parser.add_argument("--wait-seconds", type=int, default=600)
    parser.add_argument("--poll-seconds", type=int, default=15)
    parser.add_argument("--dry-run", action="store_true")
    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    try:
        result = notify_from_push(args)
    except (OSError, UnicodeError, UpdateError) as exc:
        print(f"repository-updates: {exc}", file=sys.stderr)
        return 2
    print(json.dumps(result, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
