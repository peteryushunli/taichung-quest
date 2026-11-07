// Sites owns authentication before this handler. This worker changes response
// delivery only; it has no credentials, identity logic or external fetches.
export function createAssetWorker(assets) {
  const decoded = new Map();
  const isolation = {
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Cross-Origin-Embedder-Policy': 'require-corp',
    'Cross-Origin-Resource-Policy': 'same-origin',
    'X-Content-Type-Options': 'nosniff',
    'Cache-Control': 'private, no-store',
    'Vary': 'Accept-Encoding',
    'X-Taichung-Hosting': 'isolated-worker-v1',
  };

  function acceptsGzip(value) {
    const entries = value.toLowerCase().split(',').map((part) => part.trim().split(';'));
    const match = entries.find(([name]) => name.trim() === 'gzip') ?? entries.find(([name]) => name.trim() === '*');
    if (!match) return false;
    const quality = match.slice(1).find((part) => part.trim().startsWith('q='));
    return quality === undefined || Number(quality.trim().slice(2)) > 0;
  }

  function gzipBytes(path, asset) {
    if (!decoded.has(path)) {
      const binary = atob(asset.gzip);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      decoded.set(path, bytes);
    }
    return decoded.get(path);
  }

  return {
    async fetch(request) {
      const headers = new Headers(isolation);
      if (!['GET', 'HEAD'].includes(request.method)) {
        headers.set('Allow', 'GET, HEAD');
        return new Response('Method not allowed', { status: 405, headers });
      }
      const pathname = new URL(request.url).pathname;
      const path = pathname === '/' ? '/index.html' : pathname;
      const asset = Object.hasOwn(assets, path) ? assets[path] : undefined;
      if (!asset) {
        headers.set('Content-Type', 'text/plain; charset=utf-8');
        return new Response(request.method === 'HEAD' ? null : 'Not found', { status: 404, headers });
      }
      const compressed = acceptsGzip(request.headers.get('Accept-Encoding') ?? '');
      headers.set('Content-Type', asset.type);
      headers.set('Content-Length', String(compressed ? asset.gzipBytes : asset.bytes));
      if (compressed) headers.set('Content-Encoding', 'gzip');
      if (request.method === 'HEAD') return new Response(null, { headers, encodeBody: 'manual' });

      const bytes = gzipBytes(path, asset);
      // Browser requests receive precompressed assets. Identity clients get a
      // streaming decode, avoiding an extra 16 MiB cartridge allocation.
      const body = compressed ? bytes : new Response(bytes).body.pipeThrough(new DecompressionStream('gzip'));
      return new Response(body, { headers, encodeBody: 'manual' });
    },
  };
}
