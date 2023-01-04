const sqlite3 = require("sqlite3").verbose();

const DBSOURCE = "./db/db.sqlite";

const db = new sqlite3.Database(DBSOURCE, (err) => {
  if (err) {
    // Cannot open database
    console.error(err.message);
    throw err;
  } else {
    console.log("Connected to the SQLite database.");

    db.run(
      `CREATE TABLE post (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title text,
      author text,
      category text,
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

    db.run(
      `CREATE TABLE comment (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      author text,
      message text,
      post_id text
      )`,
      (err) => {
        if (err) {
          console.log("Table comment id already created:");
        } else {
          console.log("Table comment is created");
        }
      }
    );

    db.run(
      `CREATE TABLE user (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name text,
      email text UNIQUE,
      password text,
      failed_logins INTEGER,
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
  }
});

module.exports = db;
