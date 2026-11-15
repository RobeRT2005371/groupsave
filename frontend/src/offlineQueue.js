const DB_NAME = 'groupsave-offline';
const DB_VERSION = 1;
const WRITE_STORE = 'writes';
const SNAPSHOT_STORE = 'snapshots';
const SNAPSHOT_MAX_AGE = 7 * 24 * 60 * 60 * 1000;

let opening;

function openDb() {
  if (!globalThis.indexedDB) return Promise.reject(new Error('Offline storage is not available in this browser'));
  if (opening) return opening;
  opening = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(WRITE_STORE)) db.createObjectStore(WRITE_STORE, { keyPath: 'id' });
      if (!db.objectStoreNames.contains(SNAPSHOT_STORE)) db.createObjectStore(SNAPSHOT_STORE, { keyPath: 'id' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Could not open offline storage'));
    request.onblocked = () => reject(new Error('Offline storage is blocked by another open app tab'));
  }).catch((error) => {
    opening = null;
    throw error;
  });
  return opening;
}

function transact(storeName, mode, action) {
  return openDb().then((db) => new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, mode);
    let result;
    let request;
    try {
      request = action(transaction.objectStore(storeName));
    } catch (error) {
      reject(error);
      return;
    }
    if (request) {
      request.onsuccess = () => { result = request.result; };
      request.onerror = () => reject(request.error || new Error('Offline storage request failed'));
    }
    transaction.oncomplete = () => resolve(result);
    transaction.onerror = () => reject(transaction.error || new Error('Offline storage transaction failed'));
    transaction.onabort = () => reject(transaction.error || new Error('Offline storage transaction was aborted'));
  }));
}

function changed() {
  window.dispatchEvent(new Event('groupsave:offline-queue-change'));
}

const sameIdentity = (row, identity) =>
  identity && String(row.groupId) === String(identity.groupId) && String(row.actorId) === String(identity.id);

export async function addOfflineWrite({ path, body, key, identity, label }) {
  if (!identity?.id || !identity?.groupId) throw new Error('Sign in again before saving this offline');
  const entry = {
    id: key,
    key,
    path,
    body,
    actorId: String(identity.id),
    groupId: String(identity.groupId),
    label,
    status: 'pending',
    error: '',
    createdAt: new Date().toISOString(),
  };
  await transact(WRITE_STORE, 'readwrite', (store) => store.add(entry));
  changed();
  return { queued: true, queueId: entry.id };
}

export async function listOfflineWrites(identity) {
  if (!identity?.id || !identity?.groupId) return [];
  const rows = await transact(WRITE_STORE, 'readonly', (store) => store.getAll());
  return rows.filter((row) => sameIdentity(row, identity)).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function updateOfflineWrite(entry) {
  await transact(WRITE_STORE, 'readwrite', (store) => store.put(entry));
  changed();
}

export async function removeOfflineWrite(id) {
  await transact(WRITE_STORE, 'readwrite', (store) => store.delete(id));
  changed();
}

function snapshotId(path, identity) {
  return `${identity.groupId}:${identity.id}:${path}`;
}

export async function saveOfflineSnapshot(path, value, identity) {
  if (!identity?.id || !identity?.groupId) return;
  await transact(SNAPSHOT_STORE, 'readwrite', (store) => store.put({
    id: snapshotId(path, identity),
    path,
    actorId: String(identity.id),
    groupId: String(identity.groupId),
    value,
    cachedAt: Date.now(),
  }));
}

export async function readOfflineSnapshot(path, identity) {
  if (!identity?.id || !identity?.groupId) return null;
  const entry = await transact(SNAPSHOT_STORE, 'readonly', (store) => store.get(snapshotId(path, identity)));
  if (!entry || !sameIdentity(entry, identity) || Date.now() - entry.cachedAt > SNAPSHOT_MAX_AGE) return null;
  return entry.value;
}
