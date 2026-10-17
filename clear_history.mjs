import sqlite3 from 'sqlite3';
const db = new sqlite3.Database('/home/harikesh/.config/Anikage/anikage.db');
db.serialize(() => {
  db.run("DELETE FROM watch_history", (err) => {
    if (err) console.error(err);
    else console.log("History cleared successfully.");
  });
});
db.close();
