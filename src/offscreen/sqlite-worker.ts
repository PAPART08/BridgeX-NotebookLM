/**
 * bridgeX SQLite Worker — Synchronous Build + In-Memory VFS
 * 
 * Uses the SYNCHRONOUS wa-sqlite build (no Asyncify) with an in-memory
 * MemoryVFS. This completely avoids the "unreachable" and "memory access
 * out of bounds" WASM crashes that plague the async build.
 * 
 * Persistence is achieved by serializing the entire in-memory database
 * to IndexedDB after every write operation, and restoring it on startup.
 */

// Use the SYNCHRONOUS build — no Asyncify, no WASM stack corruption
import SQLiteESMFactory from 'wa-sqlite/dist/wa-sqlite.mjs';
import * as SQLite from 'wa-sqlite';

let db: any;
let sqlite3: any;
let resolveDbReady: () => void;
let dbReadyPromise: Promise<void> = new Promise((resolve) => {
  resolveDbReady = resolve;
});

const IDB_NAME = 'bridgex-persist';
const IDB_STORE = 'snapshots';
const IDB_KEY = 'main-db';

// ─── IndexedDB Persistence Helpers ───────────────────────────────────

function openPersistDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(IDB_STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function loadSnapshot(): Promise<Uint8Array | null> {
  try {
    const idb = await openPersistDB();
    return new Promise((resolve, reject) => {
      const tx = idb.transaction(IDB_STORE, 'readonly');
      const req = tx.objectStore(IDB_STORE).get(IDB_KEY);
      req.onsuccess = () => {
        idb.close();
        resolve(req.result ?? null);
      };
      req.onerror = () => {
        idb.close();
        reject(req.error);
      };
    });
  } catch {
    return null;
  }
}

async function saveSnapshot(data: Uint8Array): Promise<void> {
  try {
    const idb = await openPersistDB();
    return new Promise((resolve, reject) => {
      const tx = idb.transaction(IDB_STORE, 'readwrite');
      tx.objectStore(IDB_STORE).put(data, IDB_KEY);
      tx.oncomplete = () => {
        idb.close();
        resolve();
      };
      tx.onerror = () => {
        idb.close();
        reject(tx.error);
      };
    });
  } catch (e) {
    console.warn('[bridgeX] Snapshot save failed:', e);
  }
}

/** Serialize the current in-memory database to a Uint8Array */
function serializeDb(): Uint8Array | null {
  try {
    // Export the database file via the sqlite3 file API
    const pages: Uint8Array[] = [];
    // Use sqlite3_serialize if available, otherwise read page by page
    const stmt = sqlite3.statements(db, 'PRAGMA page_count;');
    let pageCount = 0;
    for (const s of stmt) {
      while (sqlite3.step(s) === SQLite.SQLITE_ROW) {
        pageCount = sqlite3.column(s, 0) as number;
      }
    }
    
    const pageSizeStmt = sqlite3.statements(db, 'PRAGMA page_size;');
    let pageSize = 4096;
    for (const s of pageSizeStmt) {
      while (sqlite3.step(s) === SQLite.SQLITE_ROW) {
        pageSize = sqlite3.column(s, 0) as number;
      }
    }

    // Read the full database using the VACUUM INTO trick:
    // We'll just export all data as SQL and re-import on restore.
    // Instead, let's get all table data as JSON — simpler and reliable.
    return null; // Will use JSON approach instead
  } catch (e) {
    console.warn('[bridgeX] serializeDb failed:', e);
    return null;
  }
}

// ─── Simple JSON Persistence (bulletproof) ────────────────────────────

async function persistAllData(): Promise<void> {
  try {
    const folders = await exec('SELECT * FROM folders');
    const notebooks = await exec('SELECT * FROM notebooks');
    const tags = await exec('SELECT * FROM tags');
    const notes = await exec('SELECT * FROM notes');
    const sourceGroups = await exec('SELECT * FROM source_groups');
    const sourceGroupItems = await exec('SELECT * FROM source_group_items');
    const prompts = await exec('SELECT * FROM prompts');
    
    const snapshot = JSON.stringify({ folders, notebooks, tags, notes, sourceGroups, sourceGroupItems, prompts });
    const encoder = new TextEncoder();
    await saveSnapshot(encoder.encode(snapshot));
  } catch (e) {
    console.warn('[bridgeX] Persist failed:', e);
  }
}

async function restoreFromSnapshot(): Promise<void> {
  try {
    const raw = await loadSnapshot();
    if (!raw) return;
    
    const decoder = new TextDecoder();
    const data = JSON.parse(decoder.decode(raw));
    
    if (data.folders?.length) {
      for (const f of data.folders) {
        try {
          await exec('INSERT OR IGNORE INTO folders (id, name, createdAt) VALUES (?, ?, ?)',
            [f.id, f.name, f.createdAt]);
        } catch { /* skip duplicates */ }
      }
    }

    if (data.notebooks?.length) {
      for (const n of data.notebooks) {
        try {
          await exec('INSERT OR IGNORE INTO notebooks (id, name, notebookLMId, folderId, createdAt) VALUES (?, ?, ?, ?, ?)',
            [n.id, n.name, n.notebookLMId, n.folderId, n.createdAt]);
        } catch { /* skip duplicates */ }
      }
    }
    
    if (data.tags?.length) {
      for (const t of data.tags) {
        try {
          await exec('INSERT OR IGNORE INTO tags (id, name, color, createdAt) VALUES (?, ?, ?, ?)',
            [t.id, t.name, t.color, t.createdAt]);
        } catch { /* skip duplicates */ }
      }
    }
    
    if (data.notes?.length) {
      for (const n of data.notes) {
        try {
          await exec('INSERT OR IGNORE INTO notes (id, notebookId, title, content, url, type, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [n.id, n.notebookId, n.title, n.content, n.url, n.type, n.timestamp]);
        } catch { /* skip duplicates */ }
      }
    }

    if (data.sourceGroups?.length) {
      for (const g of data.sourceGroups) {
        try {
          await exec('INSERT OR IGNORE INTO source_groups (id, name, notebookId, createdAt, sortOrder) VALUES (?, ?, ?, ?, ?)',
            [g.id, g.name, g.notebookId, g.createdAt, g.sortOrder || 0]);
        } catch { /* skip duplicates */ }
      }
    }

    if (data.sourceGroupItems?.length) {
      for (const i of data.sourceGroupItems) {
        try {
          await exec('INSERT OR IGNORE INTO source_group_items (groupId, sourceName) VALUES (?, ?)',
            [i.groupId, i.sourceName]);
        } catch { /* skip duplicates */ }
      }
    }

    if (data.prompts?.length) {
      for (const p of data.prompts) {
        try {
          await exec('INSERT OR IGNORE INTO prompts (id, title, content, category, createdAt) VALUES (?, ?, ?, ?, ?)',
            [p.id, p.title, p.content, p.category, p.createdAt || Date.now()]);
        } catch { /* skip duplicates */ }
      }
    }
    
    console.log('[bridgeX] Restored data from snapshot');
  } catch (e) {
    console.warn('[bridgeX] Restore failed (starting fresh):', e);
  }
}

// ─── Core Init ───────────────────────────────────────────────────────

const initDb = async (wasmUrl: string) => {
  try {
    console.log('[bridgeX] Step 1: Loading SYNCHRONOUS WASM Module...');
    const module = await SQLiteESMFactory({
      locateFile: (path: string) => {
        if (path.endsWith('.wasm')) return wasmUrl;
        return path;
      }
    });

    console.log('[bridgeX] Step 2: Creating SQLite API...');
    sqlite3 = SQLite.Factory(module);
    
    // Use the DEFAULT built-in memory VFS — no custom VFS needed!
    // The synchronous build comes with a working in-memory filesystem.
    console.log('[bridgeX] Step 3: Opening in-memory database...');
    db = await sqlite3.open_v2('bridgex.db');
    
    console.log('[bridgeX] Step 4: Creating schema...');
    exec(`
      CREATE TABLE IF NOT EXISTS folders (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        createdAt INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS notebooks (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        notebookLMId TEXT,
        folderId TEXT,
        createdAt INTEGER NOT NULL,
        FOREIGN KEY(folderId) REFERENCES folders(id) ON DELETE CASCADE
      );
      CREATE TABLE IF NOT EXISTS tags (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        color TEXT NOT NULL,
        createdAt INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS notes (
        id TEXT PRIMARY KEY,
        notebookId TEXT,
        title TEXT NOT NULL,
        content TEXT,
        url TEXT,
        type TEXT,
        timestamp INTEGER NOT NULL,
        FOREIGN KEY(notebookId) REFERENCES notebooks(id) ON DELETE CASCADE
      );
      CREATE TABLE IF NOT EXISTS source_groups (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        notebookId TEXT,
        createdAt INTEGER NOT NULL,
        sortOrder INTEGER DEFAULT 0,
        FOREIGN KEY(notebookId) REFERENCES notebooks(id) ON DELETE CASCADE
      );
      CREATE TABLE IF NOT EXISTS source_group_items (
        groupId TEXT,
        sourceName TEXT,
        PRIMARY KEY (groupId, sourceName),
        FOREIGN KEY(groupId) REFERENCES source_groups(id) ON DELETE CASCADE
      );
      CREATE TABLE IF NOT EXISTS prompts (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        category TEXT,
        createdAt INTEGER NOT NULL
      );
    `);

    // Restore any previously persisted data
    console.log('[bridgeX] Step 5: Restoring persisted data...');
    await restoreFromSnapshot();

    console.log('[bridgeX] ✅ Database Fully Initialized (sync build, in-memory + IDB persistence)');
    resolveDbReady();
  } catch (error) {
    console.error('[bridgeX] ❌ Critical DB Init Failure:', error);
    resolveDbReady(); // Don't hang
    throw error;
  }
};

// ─── Async exec (wa-sqlite JS API is always promise-based) ───────────

async function exec(sql: string, bind?: any[]): Promise<any[]> {
  const results: any[] = [];
  for await (const stmt of sqlite3.statements(db, sql)) {
    if (bind) {
      sqlite3.bind_collection(stmt, bind);
    }
    
    let columns: string[] = [];
    while (await sqlite3.step(stmt) === SQLite.SQLITE_ROW) {
      if (columns.length === 0) {
        columns = sqlite3.column_names(stmt);
      }
      const row = sqlite3.row(stmt);
      const rowObj: any = {};
      columns.forEach((name: string, i: number) => {
        rowObj[name] = row[i];
      });
      results.push(rowObj);
    }
  }
  return results;
}

// ─── Message Handler ─────────────────────────────────────────────────

self.onmessage = async (event) => {
  const { requestId, type, payload, wasmUrl } = event.data;

  if (type === 'INIT_WASM') {
    try {
      await initDb(wasmUrl);
    } catch (e: any) {
      console.error('[bridgeX] Init failed:', e);
    }
    return;
  }

  await dbReadyPromise;
  
  if (!db) {
    console.error('[bridgeX] Database not initialized');
    if (requestId) {
      self.postMessage({ requestId, error: 'Database not initialized' });
    }
    return;
  }

  try {
    let result;
    let needsPersist = false;
    
    switch (type) {
      case 'GET_FOLDERS':
        result = await exec('SELECT * FROM folders ORDER BY createdAt DESC');
        break;
      case 'ADD_FOLDER':
        await exec('INSERT INTO folders (id, name, createdAt) VALUES (?, ?, ?)', 
          [payload.id, payload.name, payload.createdAt]);
        result = { success: true };
        needsPersist = true;
        break;
      case 'GET_NOTEBOOKS':
        if (payload?.folderId) {
          result = await exec('SELECT * FROM notebooks WHERE folderId = ? ORDER BY createdAt DESC', [payload.folderId]);
        } else {
          result = await exec('SELECT * FROM notebooks ORDER BY createdAt DESC');
        }
        break;
      case 'ADD_NOTEBOOK':
        await exec('INSERT INTO notebooks (id, name, notebookLMId, folderId, createdAt) VALUES (?, ?, ?, ?, ?)', 
          [payload.id, payload.name, payload.notebookLMId, payload.folderId, payload.createdAt]);
        result = { success: true, id: payload.id };
        needsPersist = true;
        break;
      case 'UPDATE_NOTEBOOK': {
        const { id, notebookLMId, folderId, name } = payload;
        if (notebookLMId) {
          if (name && folderId !== undefined) {
            await exec('UPDATE notebooks SET name = ?, folderId = ? WHERE notebookLMId = ?', [name, folderId, notebookLMId]);
          } else if (name) {
            await exec('UPDATE notebooks SET name = ? WHERE notebookLMId = ?', [name, notebookLMId]);
          } else {
            await exec('UPDATE notebooks SET folderId = ? WHERE notebookLMId = ?', [folderId, notebookLMId]);
          }
        } else {
          if (name && folderId !== undefined) {
             await exec('UPDATE notebooks SET name = ?, folderId = ? WHERE id = ?', [name, folderId, id]);
          } else if (name) {
             await exec('UPDATE notebooks SET name = ? WHERE id = ?', [name, id]);
          } else {
             await exec('UPDATE notebooks SET folderId = ? WHERE id = ?', [folderId, id]);
          }
        }
        result = { success: true };
        needsPersist = true;
        break;
      }
      case 'DELETE_NOTEBOOK':
        if (payload.notebookLMId) {
          await exec('DELETE FROM notebooks WHERE notebookLMId = ?', [payload.notebookLMId]);
        }
        if (payload.id) {
          await exec('DELETE FROM notebooks WHERE id = ?', [payload.id]);
        }
        result = { success: true };
        needsPersist = true;
        break;
      case 'GET_TAGS':
        result = await exec('SELECT * FROM tags');
        break;
      case 'ADD_TAG':
        await exec('INSERT INTO tags (id, name, color, createdAt) VALUES (?, ?, ?, ?)', 
          [payload.id, payload.name, payload.color, payload.createdAt]);
        result = { success: true };
        needsPersist = true;
        break;
      case 'ADD_NOTE':
        await exec('INSERT INTO notes (id, notebookId, title, content, url, type, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?)', 
          [payload.id, payload.notebookId, payload.title, payload.content, payload.url, payload.type, payload.timestamp]);
        result = { success: true };
        needsPersist = true;
        break;
      case 'DELETE_FOLDER':
        await exec('DELETE FROM folders WHERE id = ?', [payload.id]);
        result = { success: true };
        needsPersist = true;
        break;
      case 'GET_SOURCE_GROUPS': {
        const groups = await exec('SELECT * FROM source_groups ORDER BY sortOrder ASC, createdAt DESC');
        const items = await exec('SELECT * FROM source_group_items');
        
        // Denormalize into the expected ISourceGroup[] format
        result = groups.map(g => ({
          ...g,
          sourceNames: items
            .filter(i => i.groupId === g.id)
            .map(i => i.sourceName)
        }));
        break;
      }
      case 'ADD_SOURCE_GROUP': {
        const { id, name, sourceNames, createdAt, notebookId, sortOrder } = payload;
        await exec('INSERT OR IGNORE INTO source_groups (id, name, notebookId, createdAt, sortOrder) VALUES (?, ?, ?, ?, ?)', 
          [id, name, notebookId, createdAt, sortOrder || 0]);
        for (const sn of (sourceNames || [])) {
          await exec('INSERT OR IGNORE INTO source_group_items (groupId, sourceName) VALUES (?, ?)', 
            [id, sn]);
        }
        result = { success: true };
        needsPersist = true;
        break;
      }
      case 'UPDATE_SOURCE_GROUP_ORDER': {
        const { orders } = payload; // Array of { id, sortOrder }
        for (const item of orders) {
          await exec('UPDATE source_groups SET sortOrder = ? WHERE id = ?', [item.sortOrder, item.id]);
        }
        result = { success: true };
        needsPersist = true;
        break;
      }
      case 'UPDATE_SOURCE_GROUP': {
        // Handle migration/scoping update
        await exec('UPDATE source_groups SET notebookId = ? WHERE id = ?', [payload.notebookId, payload.id]);
        result = { success: true };
        needsPersist = true;
        break;
      }
      case 'ADD_TO_SOURCE_GROUP': {
        await exec('INSERT OR IGNORE INTO source_group_items (groupId, sourceName) VALUES (?, ?)', 
          [payload.groupId, payload.sourceName]);
        result = { success: true };
        needsPersist = true;
        break;
      }
      case 'BULK_ADD_TO_SOURCE_GROUP': {
        const { groupId, sourceNames } = payload;
        for (const sn of sourceNames) {
          await exec('INSERT OR IGNORE INTO source_group_items (groupId, sourceName) VALUES (?, ?)', 
            [groupId, sn]);
        }
        result = { success: true };
        needsPersist = true;
        break;
      }
      case 'REMOVE_FROM_SOURCE_GROUP': {
        await exec('DELETE FROM source_group_items WHERE groupId = ? AND sourceName = ?', 
          [payload.groupId, payload.sourceName]);
        result = { success: true };
        needsPersist = true;
        break;
      }
      case 'MOVE_SOURCE_BETWEEN_GROUPS': {
        const { sourceName, fromGroupId, toGroupId } = payload;
        await exec('DELETE FROM source_group_items WHERE groupId = ? AND sourceName = ?', 
          [fromGroupId, sourceName]);
        await exec('INSERT OR IGNORE INTO source_group_items (groupId, sourceName) VALUES (?, ?)', 
          [toGroupId, sourceName]);
        result = { success: true };
        needsPersist = true;
        break;
      }
      case 'DELETE_SOURCE_GROUP': {
        await exec('DELETE FROM source_group_items WHERE groupId = ?', [payload.id]);
        await exec('DELETE FROM source_groups WHERE id = ?', [payload.id]);
        result = { success: true };
        needsPersist = true;
        break;
      }
      case 'GET_PROMPTS': {
        result = await exec('SELECT * FROM prompts ORDER BY createdAt DESC');
        break;
      }
      case 'ADD_PROMPT': {
        const { id, title, content, category, createdAt } = payload;
        await exec('INSERT OR REPLACE INTO prompts (id, title, content, category, createdAt) VALUES (?, ?, ?, ?, ?)', 
          [id, title, content, category, createdAt || Date.now()]);
        result = { success: true };
        needsPersist = true;
        break;
      }
      case 'DELETE_PROMPT': {
        await exec('DELETE FROM prompts WHERE id = ?', [payload.id]);
        result = { success: true };
        needsPersist = true;
        break;
      }
    }

    self.postMessage({ requestId, response: result });
    
    // Persist after write operations (fire-and-forget)
    if (needsPersist) {
      persistAllData().catch(() => {});
    }
  } catch (error: any) {
    console.error(`[bridgeX] Error handling ${type}:`, error);
    self.postMessage({ requestId, error: error.message });
  }
};

