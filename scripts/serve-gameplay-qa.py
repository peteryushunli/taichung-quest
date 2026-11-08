#!/usr/bin/env python3
"""Run native gameplay QA with exports saved directly in the shared repository."""
import argparse
from datetime import datetime, timezone
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import re
import subprocess
import sys
from threading import Lock
from urllib.parse import urlsplit


EXPORT_JS = r'''  async function download(bytes, type, filename) {
    const response = await fetch('/qa-export', {
      method: 'POST',
      headers: { 'Content-Type': type, 'X-QA-Filename': filename },
      body: new Blob([bytes], { type }),
    });
    const receipt = await response.json();
    if (!response.ok) throw new Error(receipt.error || `Repo export failed: ${response.status}`);
    byId('last-action').textContent = `Saved to ${receipt.path} (${receipt.bytes} bytes; SHA-256 ${receipt.sha256}).`;
    return receipt;
  }
'''


def patch_page(document):
    text = document.decode('utf-8')
    text, count = re.subn(r'  function download\(bytes, type, filename\) \{\n.*?\n  \}\n',
                          lambda _: EXPORT_JS, text, flags=re.S)
    if count != 1:
        raise ValueError('Unsupported QA export template; refusing browser-download fallback')
    for name in ('save', 'parties', 'travel'):
        text = text.replace(f"byId('download-{name}').addEventListener('click', () => {{",
                            f"byId('download-{name}').addEventListener('click', async () => {{")
    text = re.sub(r'(?m)^(\s+)download\(', r'\1await download(', text)
    text = text.replace('`Downloaded ${filename}; ${frame.width}×${frame.height}, ${nonBlackPixels} non-black pixels from the native game canvas.`',
                        "` ${frame.width}×${frame.height}, ${nonBlackPixels} non-black native canvas pixels.`")
    text = text.replace('`Downloaded ${filename} (${bytes.length} bytes).`',
                        '` Native SRAM: ${bytes.length} bytes.`')
    text = text.replace("byId('last-action').textContent = ` ${frame.width}",
                        "byId('last-action').textContent += ` ${frame.width}")
    text = text.replace("byId('last-action').textContent = ` Native SRAM:",
                        "byId('last-action').textContent += ` Native SRAM:")
    for old, new in [('Download screen', 'Save screen to repo'), ('Download save', 'Save native save to repo'),
                     ('Download party report', 'Save party report to repo'), ('Download travel report', 'Save travel report to repo')]:
        text = text.replace(old, new)
    text = text.replace('download failed:', 'repo export failed:')
    if 'URL.createObjectURL' in text or 'link.download' in text or re.search(r'(?m)^\s*download\(', text):
        raise ValueError('Unconverted browser download found; refusing to serve QA page')
    return text.encode('utf-8')


def export_handler(base_handler, destination, rom_sha256):
    log_lock = Lock()

    class RepoExports(base_handler):
        def export_response(self, code, data):
            payload = (json.dumps(data) + '\n').encode()
            self.send_response(code)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Content-Length', str(len(payload)))
            self.end_headers()
            self.wfile.write(payload)

        def do_POST(self):
            if urlsplit(self.path).path != '/qa-export':
                self.send_error(404)
                return
            port = self.server.server_address[1]
            hosts = {f'127.0.0.1:{port}', f'localhost:{port}'}
            if self.headers.get('Host') not in hosts or self.headers.get('Origin') not in {'http://' + h for h in hosts}:
                self.export_response(403, {'error': 'QA exports require the same loopback origin'})
                return
            name = self.headers.get('X-QA-Filename', '')
            if not re.fullmatch(r'[A-Za-z0-9][A-Za-z0-9._-]{0,179}\.(png|json|sav)', name):
                self.export_response(400, {'error': 'Use a plain PNG, JSON or SAV filename'})
                return
            try:
                length = int(self.headers.get('Content-Length', '0'))
                if not 0 < length <= 2 * 1024 * 1024:
                    raise ValueError('QA export must be between 1 byte and 2 MiB')
                payload = self.rfile.read(length)
                if len(payload) != length:
                    raise ValueError('Incomplete QA export')
                suffix = Path(name).suffix
                mime = self.headers.get('Content-Type', '').split(';')[0].strip()
                if suffix == '.json':
                    if mime != 'application/json':
                        raise ValueError('JSON export requires application/json')
                    json.loads(payload)
                elif suffix == '.png':
                    if mime != 'image/png' or not payload.startswith(b'\x89PNG\r\n\x1a\n'):
                        raise ValueError('Invalid PNG export')
                elif mime != 'application/octet-stream' or length not in (0x20000, 0x20010):
                    raise ValueError('Native SRAM must be 128 KiB, optionally with a 16-byte RTC trailer')
                destination.mkdir(parents=True, exist_ok=True)
                target = destination / name
                with target.open('xb') as output:
                    output.write(payload)
                receipt = {'path': str(target), 'filename': name, 'bytes': length,
                           'sha256': hashlib.sha256(payload).hexdigest(), 'romSha256': rom_sha256,
                           'createdAt': datetime.now(timezone.utc).isoformat()}
                with log_lock, (destination / 'qa-direct-exports.jsonl').open('a') as log:
                    log.write(json.dumps(receipt) + '\n')
                self.export_response(201, receipt)
            except FileExistsError:
                self.export_response(409, {'error': 'Export filename exists; existing evidence was preserved'})
            except (ValueError, OSError) as error:
                self.export_response(400, {'error': str(error)})

    return RepoExports


def repository_root():
    checkout = Path(__file__).resolve().parents[1]
    common = subprocess.check_output(['git', 'rev-parse', '--path-format=absolute', '--git-common-dir'],
                                     cwd=checkout, text=True).strip()
    return Path(common).resolve().parent


def main():
    root = repository_root()
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--helper', type=Path, default=Path(os.environ.get('TAICHUNG_GAME_SOURCE', root / 'vendor/pokefirered')) / 'tools/taichung_gameplay/qa_server.py')
    parser.add_argument('--rom', type=Path, required=True)
    args, remaining = parser.parse_known_args()
    spec = importlib.util.spec_from_file_location('native_qa_server', args.helper.resolve())
    if spec is None or spec.loader is None:
        parser.error('Native QA helper could not be loaded')
    native = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(native)
    original_page, original_server = native.page_bytes, native.ThreadingHTTPServer
    destination = root / 'artifacts/downloads'
    rom_sha = hashlib.sha256(args.rom.read_bytes()).hexdigest()
    native.page_bytes = lambda config: patch_page(original_page(config))
    native.ThreadingHTTPServer = lambda address, handler: original_server(address, export_handler(handler, destination, rom_sha))
    print(f'QA exports: {destination}; browser downloads disabled; receipt log qa-direct-exports.jsonl', flush=True)
    sys.argv = [str(args.helper), '--rom', str(args.rom), *remaining]
    native.main()


if __name__ == '__main__':
    main()
