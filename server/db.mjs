import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import os from 'os';

const __dirname = dirname(fileURLToPath(import.meta.url));

const DB_PATH = process.env.USER_DATA_PATH
  ? join(process.env.USER_DATA_PATH, 'anikage.db')
  : (process.env.NODE_ENV === 'production'
      ? (process.platform === 'win32' 
          ? join(process.env.APPDATA || os.homedir(), 'Anikage', 'anikage.db')
          : join(os.homedir(), '.anikage.db'))
      : join(__dirname, '../anikage.db'));

let db;
try {
  db = new Database(DB_PATH);
  console.log('\x1b[34m✓\x1b[0m SQLite database connected');
} catch (err) {
  console.error('Database connection error:', err.message);
}

// Initialize tables
if (db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS watch_history (
      anime_id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      cover_image TEXT,
      last_episode TEXT,
      genres TEXT,
      provider TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS metadata_cache (
      url TEXT PRIMARY KEY,
      resolution TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS link_cache (
      key TEXT PRIMARY KEY,
      payload TEXT NOT NULL,
      size INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
  // Try adding provider column if it doesn't exist
  try {
    db.exec(`ALTER TABLE watch_history ADD COLUMN provider TEXT`);
  } catch (e) {}
}

export const db_helper = {
  // Link caching
  getLinksFromCache: (key) => {
    return new Promise((resolve, reject) => {
      try {
        const sql = `SELECT payload FROM link_cache WHERE key = ?`;
        const row = db.prepare(sql).get(key);
        resolve(row ? JSON.parse(row.payload) : null);
      } catch (err) {
        reject(err);
      }
    });
  },

  saveLinksToCache: (key, data) => {
    return new Promise((resolve, reject) => {
      try {
        const payload = JSON.stringify(data);
        const size = Buffer.byteLength(payload, 'utf8');
        const MAX_CACHE_SIZE = 10 * 1024 * 1024; // 10MB

        const insertSql = `
          INSERT INTO link_cache (key, payload, size, created_at)
          VALUES (?, ?, ?, CURRENT_TIMESTAMP)
          ON CONFLICT(key) DO UPDATE SET
            payload = excluded.payload,
            size = excluded.size,
            created_at = CURRENT_TIMESTAMP
        `;
        
        db.prepare(insertSql).run(key, payload, size);
        
        const row = db.prepare(`SELECT SUM(size) as total_size FROM link_cache`).get();
        let totalSize = row?.total_size || 0;
        
        if (totalSize > MAX_CACHE_SIZE) {
          const rows = db.prepare(`SELECT key, size FROM link_cache ORDER BY created_at ASC`).all();
          const keysToDelete = [];
          for (const r of rows) {
            if (totalSize <= MAX_CACHE_SIZE) break;
            if (r.key === key && rows.length > 1) continue;
            keysToDelete.push(r.key);
            totalSize -= r.size;
          }
          
          if (keysToDelete.length > 0) {
            const placeholders = keysToDelete.map(() => '?').join(',');
            db.prepare(`DELETE FROM link_cache WHERE key IN (${placeholders})`).run(...keysToDelete);
          }
        }
        resolve();
      } catch (err) {
        reject(err);
      }
    });
  },

  // Metadata caching
  saveMetadata: (url, resolution) => {
    return new Promise((resolve, reject) => {
      try {
        const sql = `INSERT INTO metadata_cache (url, resolution, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP) ON CONFLICT(url) DO UPDATE SET resolution = excluded.resolution, updated_at = CURRENT_TIMESTAMP`;
        db.prepare(sql).run(url, resolution);
        resolve();
      } catch (err) {
        reject(err);
      }
    });
  },

  getMetadata: (url) => {
    return new Promise((resolve, reject) => {
      try {
        const sql = `SELECT resolution FROM metadata_cache WHERE url = ?`;
        const row = db.prepare(sql).get(url);
        resolve(row ? row.resolution : null);
      } catch (err) {
        reject(err);
      }
    });
  },

  // Add or update history
  saveProgress: (animeId, title, coverImage, episode, genres, provider) => {
    return new Promise((resolve, reject) => {
      try {
        const genresStr = Array.isArray(genres) ? genres.join(',') : genres;
        const sql = `
          INSERT INTO watch_history (anime_id, title, cover_image, last_episode, genres, provider, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
          ON CONFLICT(anime_id) DO UPDATE SET
            last_episode = excluded.last_episode,
            provider = COALESCE(excluded.provider, watch_history.provider),
            updated_at = CURRENT_TIMESTAMP
        `;
        const info = db.prepare(sql).run(animeId, title, coverImage, episode, genresStr, provider || null);
        resolve(info.lastInsertRowid);
      } catch (err) {
        reject(err);
      }
    });
  },

  // Get recent history
  getRecentHistory: (limit = 10) => {
    return new Promise((resolve, reject) => {
      try {
        const sql = `SELECT * FROM watch_history ORDER BY updated_at DESC LIMIT ?`;
        const rows = db.prepare(sql).all(limit);
        resolve(rows.map(row => ({
          id: row.anime_id,
          title: row.title,
          coverImage: row.cover_image,
          lastEpisode: row.last_episode,
          tags: row.genres ? row.genres.split(',') : [],
          provider: row.provider || null,
          updatedAt: row.updated_at
        })));
      } catch (err) {
        reject(err);
      }
    });
  },

  // Get all history for analytics
  getAllHistory: () => {
    return new Promise((resolve, reject) => {
      try {
        const sql = `SELECT * FROM watch_history`;
        const rows = db.prepare(sql).all();
        resolve(rows.map(row => ({
          id: row.anime_id,
          title: row.title,
          tags: row.genres ? row.genres.split(',') : [],
        })));
      } catch (err) {
        reject(err);
      }
    });
  },

  // Clear all watch history
  clearHistory: () => {
    return new Promise((resolve, reject) => {
      try {
        const sql = `DELETE FROM watch_history`;
        db.prepare(sql).run();
        resolve({ success: true });
      } catch (err) {
        reject(err);
      }
    });
  }
};
