#!/usr/bin/env python3
"""Snapshot official PocketBase docs with only Python's standard library."""
import datetime
import json
import pathlib
import urllib.request
from html.parser import HTMLParser
from urllib.parse import urljoin, urlparse

BASE = 'https://pocketbase.io'
OUT = pathlib.Path(__file__).resolve().parents[1] / 'docs' / 'pocketbase'

class Page(HTMLParser):
    def __init__(self):
        super().__init__()
        self.links = []
        self.text = []
        self.ignored = 0
    def handle_starttag(self, tag, attrs):
        if tag in ('script', 'style'):
            self.ignored += 1
        if tag == 'a':
            self.links.extend(v for k, v in attrs if k == 'href')
    def handle_endtag(self, tag):
        if tag in ('script', 'style'):
            self.ignored = max(0, self.ignored - 1)
    def handle_data(self, data):
        if not self.ignored and data.strip():
            self.text.append(data.strip())

def main():
    OUT.mkdir(parents=True, exist_ok=True)
    queue = ['/docs/']
    seen = set()
    pages = []
    while queue:
        path = queue.pop(0)
        if path in seen:
            continue
        seen.add(path)
        with urllib.request.urlopen(BASE + path, timeout=30) as response:
            html = response.read().decode('utf-8')
        filename = path.strip('/').replace('/', '__') + '.html'
        (OUT / filename).write_text(html)
        parsed = Page()
        parsed.feed(html)
        (OUT / filename).with_suffix('.txt').write_text('\n'.join(parsed.text) + '\n')
        pages.append({'url': BASE + path, 'file': filename})
        for link in parsed.links:
            url = urlparse(urljoin(BASE + path, link))
            if url.netloc == 'pocketbase.io' and url.path.startswith('/docs/') and url.path not in seen and url.path not in queue:
                queue.append(url.path)
    (OUT / 'manifest.json').write_text(json.dumps({'retrievedAt': datetime.datetime.now(datetime.timezone.utc).isoformat(), 'pages': pages}, indent=2) + '\n')
    print(f'Dumped {len(pages)} pages to {OUT}')

if __name__ == '__main__':
    main()
