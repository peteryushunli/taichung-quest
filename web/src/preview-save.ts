import { hasReadableFireRedSave, isFullFireRedSaveSize } from './firered-save.ts';

export const PREVIEW_NEW_GAME_KEY = 'taichung-quest-preview-new-game';
const SEED_URL = '/roms/playtest-post-intro.sav';
const FILE_STORE = 'FILE_DATA';

export async function downloadPreviewSave(metadata: unknown, romSha256: string, romBytes: number, fetchFile = fetch) {
  if (!metadata || typeof metadata !== 'object') return;
  const build = metadata as Record<string, unknown>;
  if (build.sha256 !== romSha256 || build.bytes !== romBytes ||
      !build.playtestSave || typeof build.playtestSave !== 'object') return;
  const seed = build.playtestSave as Record<string, unknown>;
  if (seed.version !== 1 || typeof seed.bytes !== 'number' || !isFullFireRedSaveSize(seed.bytes) ||
      typeof seed.sha256 !== 'string' || !/^[a-f\d]{64}$/.test(seed.sha256)) return;

  const response = await fetchFile(SEED_URL, { cache: 'no-cache' });
  if (!response.ok) return;
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.byteLength !== seed.bytes || !hasReadableFireRedSave(bytes)) return;
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
  const hash = [...digest].map((byte) => byte.toString(16).padStart(2, '0')).join('');
  if (hash === seed.sha256) return bytes;
}

export function isTaichungSnapshot(path: string, directory: string) {
  const prefix = `${directory}/`;
  return path.startsWith(prefix) && /^taichung-firered(?:-[a-f0-9]{16})?_auto\.ss$/.test(path.slice(prefix.length));
}

/** Both databases belong to mounted mGBA IDBFS stores. An unavailable store
 * falls back to ordinary boot instead of assuming this browser is empty. */
function openMountedStore(databaseName: string) {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(databaseName);
    request.onupgradeneeded = () => request.transaction?.abort();
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error('The save database is blocked.'));
    request.onsuccess = () => {
      const db = request.result;
      if (db.objectStoreNames.contains(FILE_STORE)) resolve(db);
      else { db.close(); reject(new Error('The save file store is unavailable.')); }
    };
  });
}

async function hasStoredSnapshot(directory: string) {
  const database = await openMountedStore(directory);
  try {
    return await new Promise<boolean>((resolve, reject) => {
      const query = database.transaction(FILE_STORE).objectStore(FILE_STORE).getAllKeys();
      query.onerror = () => reject(query.error);
      query.onsuccess = () => resolve(query.result.some((key) => typeof key === 'string' && isTaichungSnapshot(key, directory)));
    });
  } finally {
    database.close();
  }
}

/** Add SRAM once to the same store the emulator will hydrate. Never put over
 * a file, even when a competing tab saves during the download. */
export async function addPreviewSave(bytes: Uint8Array, paths: {
  database: string; save: string; saveDirectory: string; snapshots: string;
}, stillWanted: () => boolean) {
  if (!stillWanted() || await hasStoredSnapshot(paths.snapshots)) return false;
  const database = await openMountedStore(paths.database);
  try {
    return await new Promise<boolean>((resolve, reject) => {
      const transaction = database.transaction(FILE_STORE, 'readwrite');
      const store = transaction.objectStore(FILE_STORE);
      let added = false;
      transaction.oncomplete = () => resolve(added);
      transaction.onabort = () => reject(transaction.error ?? new Error('Preview save transaction aborted.'));
      const existing = store.getKey(paths.save);
      existing.onsuccess = () => {
        if (existing.result !== undefined || !stillWanted()) return;
        const directory = store.getKey(paths.saveDirectory);
        directory.onsuccess = () => {
          if (!stillWanted()) return;
          const timestamp = new Date();
          if (directory.result === undefined) store.add({ timestamp, mode: 0o40755 }, paths.saveDirectory);
          store.add({ timestamp, mode: 0o100644, contents: bytes }, paths.save);
          added = true;
        };
      };
    });
  } finally {
    database.close();
  }
}
