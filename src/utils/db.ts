import { StoredPdfRecord } from '../types';

const DB_NAME = 'DarkdocsDB';
const DB_VERSION = 1;
const STORE_NAME = 'pdf_documents';

/**
 * Converts ArrayBuffer to Base64 string safely
 */
export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  const chunkSize = 8192; // Chunking to avoid stack overflow with large files
  for (let i = 0; i < len; i += chunkSize) {
    const chunk = bytes.subarray(i, Math.min(i + chunkSize, len));
    binary += String.fromCharCode.apply(null, Array.from(chunk));
  }
  return btoa(binary);
}

/**
 * Converts Base64 string back to ArrayBuffer
 */
export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB no está disponible en este entorno.'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('uploadDate', 'uploadDate', { unique: false });
        store.createIndex('name', 'name', { unique: false });
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      console.error('IndexedDB open error:', request.error);
      reject(request.error || new Error('Error al abrir IndexedDB'));
    };
  });
}

/**
 * Saves or updates a PDF document record in IndexedDB.
 * Clones the ArrayBuffer and stores Base64 to prevent detached buffer issues.
 */
export async function savePdfToDb(record: StoredPdfRecord): Promise<void> {
  const db = await openDatabase();

  // Prepare a safe copy of the record
  const safeRecord: StoredPdfRecord = {
    id: record.id,
    name: record.name,
    size: record.size,
    uploadDate: record.uploadDate,
    totalPages: record.totalPages,
  };

  if (record.arrayBuffer && record.arrayBuffer.byteLength > 0) {
    safeRecord.arrayBuffer = record.arrayBuffer.slice(0);
    // Only store Base64 backup for small files (< 4MB) to prevent freezing for large multi-page books
    if (!record.dataBase64 && record.arrayBuffer.byteLength < 4 * 1024 * 1024) {
      try {
        safeRecord.dataBase64 = arrayBufferToBase64(record.arrayBuffer);
      } catch (err) {
        console.warn('Could not generate Base64 backup:', err);
      }
    } else if (record.dataBase64) {
      safeRecord.dataBase64 = record.dataBase64;
    }
  } else if (record.dataBase64) {
    safeRecord.dataBase64 = record.dataBase64;
  }

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.put(safeRecord);

    request.onsuccess = () => resolve();
    request.onerror = () => {
      console.error('Failed to put record in IndexedDB:', request.error);
      reject(request.error);
    };
  });
}

/**
 * Normalizes a record ensuring a valid, usable ArrayBuffer
 */
function normalizeRecord(raw: StoredPdfRecord): StoredPdfRecord {
  const rec: StoredPdfRecord = { ...raw };

  if ((!rec.arrayBuffer || rec.arrayBuffer.byteLength === 0) && rec.dataBase64) {
    try {
      rec.arrayBuffer = base64ToArrayBuffer(rec.dataBase64);
    } catch (err) {
      console.error('Failed to reconstruct ArrayBuffer from Base64:', err);
    }
  } else if (rec.arrayBuffer && rec.arrayBuffer.byteLength > 0) {
    // Return a fresh clone so consumers never detach the stored instance
    rec.arrayBuffer = rec.arrayBuffer.slice(0);
  }

  return rec;
}

/**
 * Retrieves all stored PDF documents from IndexedDB, ordered from newest to oldest
 */
export async function getAllPdfsFromDb(): Promise<StoredPdfRecord[]> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        const rawRecords = (request.result as StoredPdfRecord[]) || [];
        const records = rawRecords.map(normalizeRecord);
        // Sort newest first
        records.sort((a, b) => new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime());
        resolve(records);
      };
      request.onerror = () => {
        console.error('Failed to get all records from IndexedDB:', request.error);
        reject(request.error);
      };
    });
  } catch (err) {
    console.error('IndexedDB getAll error:', err);
    return [];
  }
}

/**
 * Retrieves a single PDF record with its full ArrayBuffer by ID
 */
export async function getPdfRecordFromDb(id: string): Promise<StoredPdfRecord | null> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(id);

      request.onsuccess = () => {
        const raw = request.result as StoredPdfRecord | undefined;
        if (!raw) {
          resolve(null);
          return;
        }
        resolve(normalizeRecord(raw));
      };
      request.onerror = () => {
        console.error('Failed to get record from IndexedDB:', request.error);
        reject(request.error);
      };
    });
  } catch (err) {
    console.error('IndexedDB get error:', err);
    return null;
  }
}

/**
 * Deletes a PDF document from IndexedDB
 */
export async function deletePdfFromDb(id: string): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => {
      console.error('Failed to delete record from IndexedDB:', request.error);
      reject(request.error);
    };
  });
}
