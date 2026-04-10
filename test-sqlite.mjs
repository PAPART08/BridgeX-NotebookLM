import SQLiteESMFactory from 'wa-sqlite/dist/wa-sqlite.mjs';
import * as SQLite from 'wa-sqlite';

async function run() {
  const module = await SQLiteESMFactory();
  const sqlite3 = SQLite.Factory(module);
  const db = await sqlite3.open_v2('test.db');
  
  async function exec(sql, bind) {
    const results = [];
    for await (const stmt of sqlite3.statements(db, sql)) {
      if (bind) sqlite3.bind_collection(stmt, bind);
      let columns = [];
      while (await sqlite3.step(stmt) === SQLite.SQLITE_ROW) {
        if (columns.length === 0) columns = sqlite3.column_names(stmt);
        const row = sqlite3.row(stmt);
        const rowObj = {};
        columns.forEach((name, i) => { rowObj[name] = row[i]; });
        results.push(rowObj);
      }
    }
    return results;
  }

  await exec(`
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
    CREATE TABLE IF NOT EXISTS source_groups (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        notebookId TEXT,
        createdAt INTEGER NOT NULL,
        sortOrder INTEGER DEFAULT 0,
        sourceIds TEXT,
        FOREIGN KEY(notebookId) REFERENCES notebooks(id) ON DELETE CASCADE
      );
  `);
  
  try {
     await exec('ALTER TABLE source_groups ADD COLUMN sourceIds TEXT');
  } catch (e) {
     console.log("ALready exists, fine.");
  }

  await exec('INSERT INTO folders (id, name, createdAt) VALUES (?, ?, ?)', ['1', 'test_folder', 12345]);
  const rows = await exec('SELECT * FROM folders');
  console.log("Folders:", rows);
}

run().catch(console.error);

