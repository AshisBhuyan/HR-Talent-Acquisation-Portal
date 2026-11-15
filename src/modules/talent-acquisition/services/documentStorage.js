/**
 * Browser-only blob persistence for candidate documents.
 *
 * Large binary payloads never enter localStorage. File blobs live in
 * IndexedDB under the Talent Acquisition namespace, while workflow records
 * keep only metadata (file name, size, MIME type, storage key, versions).
 */

const DB_NAME = 'ecometrix-talent-acquisition-documents';
const DB_VERSION = 1;
const STORE_NAME = 'blobs';

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: 'key' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Unable to open the document store.'));
  });
}

export function makeStorageKey(parts) {
  return ['ta-doc', ...parts].join(':');
}

export async function putBlob(key, file) {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readwrite');
    transaction.objectStore(STORE_NAME).put({
      key,
      blob: file,
      type: file.type,
      name: file.name,
      size: file.size,
      storedAt: new Date().toISOString(),
    });
    transaction.oncomplete = () => {
      database.close();
      resolve(key);
    };
    transaction.onerror = () => {
      database.close();
      reject(transaction.error || new Error('The document could not be stored in the browser.'));
    };
  });
}

export async function getBlob(key) {
  if (!key) return null;
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readonly');
    const request = transaction.objectStore(STORE_NAME).get(key);
    request.onsuccess = () => {
      database.close();
      resolve(request.result?.blob || null);
    };
    request.onerror = () => {
      database.close();
      reject(request.error || new Error('The document could not be read from the browser store.'));
    };
  });
}

export async function deleteBlob(key) {
  if (!key) return;
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readwrite');
    transaction.objectStore(STORE_NAME).delete(key);
    transaction.oncomplete = () => {
      database.close();
      resolve();
    };
    transaction.onerror = () => {
      database.close();
      reject(transaction.error || new Error('The document could not be removed from the browser store.'));
    };
  });
}
