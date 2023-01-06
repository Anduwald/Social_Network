const sqlite3 = require("sqlite3").verbose();

const DBSOURCE = "./database/db.sqlite";

const db = new sqlite3.Database(DBSOURCE, (err) => {
  if (err) {
    // Cannot open database
    console.error(err.message);
    throw err;
  } else {
    console.log("Connected to the SQLite database.");

    db.run(
      `CREATE TABLE user (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name text,
      surname text,
      avatar_name text,
      email text UNIQUE,
      password text,
      CONSTRAINT email_unique UNIQUE (email)
      )`,
      (err) => {
        if (err) {
          console.log("Table user is already created");
        } else {
          console.log("Table user is created");
        }
      }
    );

    db.run(
      `CREATE TABLE post (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title text,
      user_id text,
      body text
      )`,
      (err) => {
        if (err) {
          console.log("Table post id already created:");
        } else {
          console.log("Table post is created");
        }
      }
    );
  }
});

module.exports = db;
