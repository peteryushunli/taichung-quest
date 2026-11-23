/** Reads a response body, reporting whole percents of the expected decoded size.
 * The host compresses the cartridge, so Content-Length cannot give that size. */
export async function readWithProgress(response: Response, expectedBytes: number | undefined, onPercent: (percent: number) => void) {
  if (!response.body || !expectedBytes) return new Uint8Array(await response.arrayBuffer());
  const reader = response.body.getReader();
  const chunks: Uint8Array<ArrayBuffer>[] = [];
  let received = 0;
  let shown = -1;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    received += value.byteLength;
    const percent = Math.min(100, Math.floor(received / expectedBytes * 100));
    if (percent !== shown) onPercent(shown = percent);
  }
  const bytes = new Uint8Array(received);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return bytes;
}
