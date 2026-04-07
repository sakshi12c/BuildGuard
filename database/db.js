const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const dbPath = process.env.DB_PATH || './database/buildguard.db';
const resolvedPath = path.resolve(path.join(__dirname, '..'), dbPath);
const dbDir = path.dirname(resolvedPath);

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new sqlite3.Database(resolvedPath, (err) => {
  if (err) {
    console.error('❌ Could not connect to database:', err.message);
  } else {
    console.log('✅ Connected to SQLite database');
  }
});

// Create table if not exists
db.run(`
  CREATE TABLE IF NOT EXISTS build_checks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    filename TEXT NOT NULL,
    check_date TEXT NOT NULL,
    is_reproducible INTEGER NOT NULL,
    score INTEGER NOT NULL,
    hash1 TEXT,
    hash2 TEXT,
    file_size INTEGER,
    build_time_ms INTEGER,
    details TEXT
  )
`);

// Helper: run INSERT/UPDATE/DELETE → returns Promise with { lastID, changes }
db.runAsync = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });

// Helper: get single row → returns Promise with row or undefined
db.getAsync = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });

// Helper: get all rows → returns Promise with array
db.allAsync = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });

module.exports = db;