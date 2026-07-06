export function initDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('IndexedDB is only available in the browser'));
      return;
    }
    const request = indexedDB.open('personifier-offline', 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('tracks')) {
        db.createObjectStore('tracks', { keyPath: 'trackId' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function cacheTrack(trackId: string, audioUrl: string): Promise<void> {
  const db = await initDb();
  // Fetch the audio content as a blob
  const res = await fetch(audioUrl);
  if (!res.ok) throw new Error('Failed to fetch audio stream');
  const blob = await res.blob();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction('tracks', 'readwrite');
    const store = transaction.objectStore('tracks');
    const request = store.put({ trackId, blob, cachedAt: Date.now() });

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function getCachedTrackUrl(trackId: string): Promise<string | null> {
  const db = await initDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('tracks', 'readonly');
    const store = transaction.objectStore('tracks');
    const request = store.get(trackId);

    request.onsuccess = () => {
      const record = request.result;
      if (record && record.blob) {
        // Create an Object URL for the blob
        const objectUrl = URL.createObjectURL(record.blob);
        resolve(objectUrl);
      } else {
        resolve(null);
      }
    };
    request.onerror = () => reject(request.error);
  });
}

export async function isTrackCached(trackId: string): Promise<boolean> {
  const db = await initDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('tracks', 'readonly');
    const store = transaction.objectStore('tracks');
    const request = store.getKey(trackId);

    request.onsuccess = () => resolve(request.result !== undefined);
    request.onerror = () => reject(request.error);
  });
}

export async function deleteCachedTrack(trackId: string): Promise<void> {
  const db = await initDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('tracks', 'readwrite');
    const store = transaction.objectStore('tracks');
    const request = store.delete(trackId);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}
