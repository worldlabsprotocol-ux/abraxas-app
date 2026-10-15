// FILE: lib/passport/holderPossessionKeyBrowserStorage.ts
// Holder possession keys stay in the browser. Abraxas never receives private key material.

const SESSION_SECRET = "abraxas_passport_possession_secret";
const SESSION_PUBLIC = "abraxas_passport_possession_public";
const PERSIST_PREF = "abraxas_passport_possession_remember_device";
const IDB_NAME = "abraxas_passport_possession";
const IDB_STORE = "keys";
const IDB_KEY = "device_v1";

export type HolderPossessionKeyMaterial = {
  secretKeyB64Url: string;
  publicKeyB64Url: string;
  source: "session" | "indexed_db";
};

function hasWindow(): boolean {
  return typeof window !== "undefined" && typeof window.sessionStorage !== "undefined";
}

export function isPossessionRememberDeviceEnabled(): boolean {
  if (!hasWindow()) return false;
  return window.localStorage.getItem(PERSIST_PREF) === "1";
}

export function setPossessionRememberDevice(enabled: boolean): void {
  if (!hasWindow()) return;
  if (enabled) window.localStorage.setItem(PERSIST_PREF, "1");
  else {
    window.localStorage.removeItem(PERSIST_PREF);
    void clearPersistedPossessionKey();
  }
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("indexed_db_open_failed"));
  });
}

async function readPersisted(): Promise<{ secretKeyB64Url: string; publicKeyB64Url: string } | null> {
  if (!hasWindow() || !isPossessionRememberDeviceEnabled()) return null;
  try {
    const db = await openDb();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, "readonly");
      const getReq = tx.objectStore(IDB_STORE).get(IDB_KEY);
      getReq.onsuccess = () => {
        const val = getReq.result as { secretKeyB64Url?: string; publicKeyB64Url?: string } | undefined;
        if (val?.secretKeyB64Url && val?.publicKeyB64Url) {
          resolve({ secretKeyB64Url: val.secretKeyB64Url, publicKeyB64Url: val.publicKeyB64Url });
        } else resolve(null);
      };
      getReq.onerror = () => reject(getReq.error);
    });
  } catch {
    return null;
  }
}

async function writePersisted(secretKeyB64Url: string, publicKeyB64Url: string): Promise<void> {
  if (!hasWindow() || !isPossessionRememberDeviceEnabled()) return;
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, "readwrite");
    tx.objectStore(IDB_STORE).put({ secretKeyB64Url, publicKeyB64Url }, IDB_KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function clearPersistedPossessionKey(): Promise<void> {
  if (!hasWindow()) return;
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, "readwrite");
      tx.objectStore(IDB_STORE).delete(IDB_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    /* ignore */
  }
}

export function readSessionPossessionKey(): HolderPossessionKeyMaterial | null {
  if (!hasWindow()) return null;
  const secretKeyB64Url = window.sessionStorage.getItem(SESSION_SECRET);
  const publicKeyB64Url = window.sessionStorage.getItem(SESSION_PUBLIC);
  if (!secretKeyB64Url || !publicKeyB64Url) return null;
  return { secretKeyB64Url, publicKeyB64Url, source: "session" };
}

export async function loadHolderPossessionKeyMaterial(): Promise<HolderPossessionKeyMaterial | null> {
  const session = readSessionPossessionKey();
  if (session) return session;
  const persisted = await readPersisted();
  if (!persisted) return null;
  if (hasWindow()) {
    window.sessionStorage.setItem(SESSION_SECRET, persisted.secretKeyB64Url);
    window.sessionStorage.setItem(SESSION_PUBLIC, persisted.publicKeyB64Url);
  }
  return { ...persisted, source: "indexed_db" };
}

export async function storeHolderPossessionKeyMaterial(input: {
  secretKeyB64Url: string;
  publicKeyB64Url: string;
  rememberOnDevice: boolean;
}): Promise<void> {
  if (!hasWindow()) return;
  setPossessionRememberDevice(input.rememberOnDevice);
  window.sessionStorage.setItem(SESSION_SECRET, input.secretKeyB64Url);
  window.sessionStorage.setItem(SESSION_PUBLIC, input.publicKeyB64Url);
  if (input.rememberOnDevice) {
    await writePersisted(input.secretKeyB64Url, input.publicKeyB64Url);
  } else {
    await clearPersistedPossessionKey();
  }
}
