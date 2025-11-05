#!/usr/bin/env python3
"""Generate a manifest of repository documents for site search."""
from __future__ import annotations

import html
import json
import re
import sys
from pathlib import Path
from typing import Dict, Iterable, List
from urllib.parse import quote

ROOT = Path(__file__).resolve().parents[1]
INCLUDE_EXTENSIONS = {'.md', '.markdown', '.html'}
SKIP_PARTS = {'.git', '.github', 'www', 'tests', 'node_modules', '__pycache__'}


def should_skip(path: Path) -> bool:
    return any(part in SKIP_PARTS for part in path.parts)


def slugify(value: str) -> str:
    slug = re.sub(r'[^a-z0-9]+', '-', value.lower()).strip('-')
    return slug or 'document'


def extract_title(path: Path, content: str, doc_type: str) -> str:
    if doc_type == 'markdown':
        match = re.search(r'^\s*#\s+(.+)', content, re.MULTILINE)
        if match:
            return match.group(1).strip()
    else:
        title_match = re.search(r'<title>(.*?)</title>', content, re.IGNORECASE | re.DOTALL)
        if title_match:
            return html.unescape(title_match.group(1).strip())
        h1_match = re.search(r'<h1[^>]*>(.*?)</h1>', content, re.IGNORECASE | re.DOTALL)
        if h1_match:
            return html.unescape(strip_html_tags(h1_match.group(1)))

    stem = path.stem.replace('-', ' ').replace('_', ' ').strip()
    return stem or path.name


def strip_markdown(text: str) -> str:
    working = re.sub(r'```[\s\S]*?```', ' ', text)
    working = re.sub(r'`([^`]*)`', r'\1', working)
    working = re.sub(r'!?\[[^\]]*\]\([^)]*\)', lambda m: m.group(0).split(']')[0][1:] if ']' in m.group(0) else '', working)
    working = re.sub(r'\*\*|__|\*|_', '', working)
    working = re.sub(r'^>\s*', '', working, flags=re.MULTILINE)
    working = re.sub(r'^#+\s*', '', working, flags=re.MULTILINE)
    return working


def strip_html_tags(text: str) -> str:
    cleaned = re.sub(r'<script[\s\S]*?</script>', ' ', text, flags=re.IGNORECASE)
    cleaned = re.sub(r'<style[\s\S]*?</style>', ' ', cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r'<[^>]+>', ' ', cleaned)
    return html.unescape(cleaned)


def build_description(content: str, doc_type: str) -> str:
    if not content:
        return ''
    if doc_type == 'markdown':
        plain = strip_markdown(content)
    else:
        plain = strip_html_tags(content)
    plain = re.sub(r'\s+', ' ', plain).strip()
    if not plain:
        return ''
    limit = 240
    return plain if len(plain) <= limit else plain[:limit].rstrip() + '…'


def categorize(path: Path) -> str:
    try:
        relative = path.relative_to(ROOT)
    except ValueError:
        return 'Root'
    parts = relative.parts
    if len(parts) <= 1:
        return 'Root'
    primary = parts[0].strip()
    return primary or 'Root'


def encode_url(path: Path) -> str:
    return '/'.join(quote(part) for part in path.as_posix().split('/'))


def gather_documents() -> List[Dict[str, str]]:
    documents: List[Dict[str, str]] = []
    seen: Dict[str, int] = {}

    for file_path in sorted(ROOT.rglob('*')):
        if not file_path.is_file():
            continue
        if file_path.suffix.lower() not in INCLUDE_EXTENSIONS:
            continue
        if should_skip(file_path):
            continue

        try:
            content = file_path.read_text(encoding='utf-8')
        except UnicodeDecodeError:
            content = file_path.read_text(encoding='utf-8', errors='ignore')

        doc_type = 'html' if file_path.suffix.lower() == '.html' else 'markdown'
        title = extract_title(file_path, content, doc_type)
        description = build_description(content, doc_type) or f'Source file {file_path.name}'
        category = categorize(file_path)

        rel_path = file_path.relative_to(ROOT)
        slug_base = slugify(rel_path.as_posix())
        counter = seen.get(slug_base, 0)
        if counter:
            slug = f"{slug_base}-{counter + 1}"
        else:
            slug = slug_base
        seen[slug_base] = counter + 1

        documents.append({
            'id': slug,
            'title': title,
            'path': rel_path.as_posix(),
            'url': encode_url(rel_path),
            'category': category,
            'description': description,
            'type': doc_type,
            'content': content
        })

    documents.sort(key=lambda item: item['path'].lower())
    return documents


def write_manifest(documents: Iterable[Dict[str, str]], destination: Path) -> None:
    destination.parent.mkdir(parents=True, exist_ok=True)
    with destination.open('w', encoding='utf-8') as handle:
        json.dump(list(documents), handle, ensure_ascii=False, indent=2)
        handle.write('\n')


def main(argv: List[str]) -> int:
    documents = gather_documents()
    if not documents:
        print('No documents found to include in manifest.', file=sys.stderr)
        return 1

    targets = [
        ROOT / 'assets' / 'documents.json',
        ROOT / 'www' / 'assets' / 'documents.json'
    ]

    for target in targets:
        write_manifest(documents, target)
        print(f'Wrote manifest with {len(documents)} entries to {target.relative_to(ROOT)}')

    return 0


if __name__ == '__main__':
    raise SystemExit(main(sys.argv[1:]))
