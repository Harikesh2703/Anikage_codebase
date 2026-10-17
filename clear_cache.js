const { app } = require('electron');
const Database = require('better-sqlite3');
app.whenReady().then(() => {
  const db = new Database('/home/harikesh/.config/Anikage/anikage.db');
  db.prepare('DELETE FROM link_cache').run();
  console.log('Cache cleared!');
  app.quit();
});
