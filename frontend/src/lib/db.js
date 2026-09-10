/**
 * src/lib/db.js — Dexie.js IndexedDB offline database.
 *
 * Stores punch pins, comments, photos, and sheets locally so the app
 * remains fully functional without network connectivity. A background
 * sync queue tracks unsynced mutations and flushes them via POST /api/sync/push
 * when the device reconnects.
 *
 * Schema
 * ------
 *  pins        : ++id, projectId, sheetId, status, updatedAt, [synced]
 *  comments    : ++id, pinId, [synced]
 *  photos      : ++id, pinId, [synced]
 *  sheets      : ++id, projectId
 *  syncQueue   : ++id, entity, operation, payload, createdAt
 */

import Dexie from "dexie";

const db = new Dexie("PunchListPro");

db.version(1).stores({
  pins:       "++id, projectId, sheetId, status, updatedAt, synced",
  comments:   "++id, pinId, synced",
  photos:     "++id, pinId, synced",
  sheets:     "++id, projectId",
  syncQueue:  "++id, entity, operation, createdAt",
});

// ── Sync queue helpers ────────────────────────────────────────────────────────

/**
 * Enqueue an offline mutation for later sync.
 * @param {"create"|"update"|"delete"} operation
 * @param {"pin"|"comment"|"photo"|"markup"} entity
 * @param {object} payload  — the mutation data
 */
export async function enqueueSync(operation, entity, payload) {
  await db.syncQueue.add({
    operation,
    entity,
    payload,
    createdAt: new Date().toISOString(),
  });
}

/**
 * Flush all queued operations to the server via POST /api/sync/push.
 * Clears successfully synced items from the queue.
 */
export async function flushSyncQueue() {
  const items = await db.syncQueue.toArray();
  if (!items.length) return;

  try {
    const response = await fetch("/api/sync/push", {
      method:  "POST",
      headers: {
        "Content-Type":  "application/json",
        "Authorization": `Bearer ${localStorage.getItem("access_token")}`,
      },
      body: JSON.stringify({ operations: items }),
    });
    if (response.ok) {
      await db.syncQueue.bulkDelete(items.map((i) => i.id));
      console.log(`[sync] flushed ${items.length} queued operations`);
    }
  } catch (err) {
    console.warn("[sync] flush failed, will retry on next reconnect:", err);
  }
}

// Auto-flush when the device comes back online
window.addEventListener("online", flushSyncQueue);

export default db;
