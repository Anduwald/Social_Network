const express = require("express");
const app = express();
const db = require("./database.js");
const bcrypt = require("bcrypt");
const session = require("express-session");
const fileUpload = require("express-fileupload");
const { v4: uuidv4 } = require("uuid");

// Configuration for server
app.set("view engine", "ejs");
app.use(
  session({
    secret: "randomly generated secret",
  })
);
app.use("/css", express.static(__dirname + "/css"));
app.use("/img", express.static(__dirname + "/img"));
app.use(
  "/bootstrap",
  express.static(__dirname + "/node_modules/bootstrap/dist")
);
app.use("/jquery", express.static(__dirname + "/node_modules/jquery/dist/"));
app.use(express.urlencoded());
app.use(fileUpload());
app.listen(3000);
// End of configuration for server

//Function for auth users
function setCurrentUser(req, res, next) {
  if (req.session.loggedIn) {
    var sql = "SELECT * FROM user WHERE id = ?";
    var params = [req.session.userId];

    db.get(sql, params, (err, row) => {
      if (row !== undefined) {
        res.locals.currentUser = row;
      }
      return next();
    });
  } else {
    return next();
  }
}

app.use(setCurrentUser);

function checkAuth(req, res, next) {
  if (req.session.loggedIn) {
    return next();
  } else {
    res.redirect("/login");
  }
}
//End of Function for auth users

// -> Routes for pages in nav
app.get("/", checkAuth, function (req, res) {
  let sql = "SELECT * FROM post where user_id = ?";
  db.all(sql, [req.session.userId], (err, rows) => {
    if (err) {
      res.status(400);
      res.send("database error:" + err.message);
      return;
    }
    res.render("index", { activePage: "home", posts: rows });
  });
});

app.get("/people", checkAuth, function (req, res) {
  let sql = "SELECT * FROM user";
  db.all(sql, [], (err, rows) => {
    if (err) {
      res.status(400);
      res.send("database error:" + err.message);
      return;
    }
    res.render("people", { activePage: "people", users: rows });
  });
});

app.get("/user/:id", checkAuth, function (req, res) {
  let sql = "SELECT * FROM post where user_id = ?";
  db.all(sql, [req.params.id], (err, rows) => {
    if (err) {
      res.status(400);
      res.send("database error:" + err.message);
      return;
    }

    let sql2 = "SELECT * FROM user where id =?";
    db.get(sql2, [req.params.id], (err, rows2) => {
      if (err) {
        res.status(400);
        res.send("database error:" + err.message);
        return;
      }

      if (rows2.id == req.session.userId) {
        res.redirect("/");
        return;
      }
      res.render("user", { activePage: "profile", posts: rows, user: rows2 });
    });
  });
});

app.post("/search", checkAuth, function (req, res) {
  let searchLine = req.body.searchLine;
  let searchLineName;
  let searchLineSurname;
  if (searchLine.indexOf(" ") == -1) {
    searchLineName = searchLine;
  } else {
    searchLineName = searchLine.substring(0, searchLine.indexOf(" "));
    searchLineSurname = searchLine.substring(searchLine.indexOf(" ") + 1);
  }

  let sql = `SELECT * FROM user WHERE name LIKE '%${searchLineName}%' AND surname LIKE '%${searchLineSurname}%'`;

  if (searchLineName == undefined) {
    data = [searchLineSurname];
    sql = `SELECT * FROM user WHERE surname LIKE '%${searchLineSurname}%'`;
  }
  if (searchLineSurname == undefined) {
    sql = `SELECT * FROM user WHERE name LIKE '%${searchLineName}%'`;
  }

  db.all(sql, [], (err, rows) => {
    if (err) {
      res.status(400);
      res.send("database error:" + err.message);
      return;
    }
    res.render("searchResult", { activePage: "people", users: rows });
  });
});

// ---> Routes for pages in posts (get / post)
app.get("/new_post", checkAuth, function (req, res) {
  res.render("new_post", { activePage: "new_post" });
});

app.post("/new_post", function async(req, res) {
  var data = [req.body.title, req.session.userId, req.body.body];
  var sql = "INSERT INTO post (title, user_id, body) VALUES (?,?,?)";
  db.run(sql, data, function (err, result) {
    if (err) {
      res.status(400);
      res.send("database error:" + err.message);
      return;
    }
    res.redirect("/");
  });
});

app.get("/posts/:id/edit", checkAuth, function (req, res) {
  var sql = "SELECT * FROM post WHERE id = ?";
  var params = [req.params.id];
  db.get(sql, params, (err, row) => {
    if (err) {
      res.status(400);
      res.send("database error:" + err.message);
      return;
    }
    res.render("edit_post", { post: row, activePage: "posts" });
  });
});

app.post("/posts/:id/edit", function (req, res) {
  var data = [req.body.title, req.body.body, req.params.id];
  db.run(
    `UPDATE post SET
 title = COALESCE(?,title),
 body = COALESCE(?,body)
 WHERE id = ?`,
    data,
    function (err, result) {
      if (err) {
        res.status(400);
        res.send("database error:" + err.message);
        return;
      }
      res.redirect("/");
    }
  );
});

app.get("/posts/:id/delete", checkAuth, function (req, res) {
  var sql = "DELETE FROM post WHERE id = ?";
  var params = [req.params.id];
  db.get(sql, params, (err, row) => {
    if (err) {
      res.status(400);
      res.send("database error:" + err.message);
      return;
    }
    res.redirect("/");
  });
});
// ---> End of routes for pages in posts

app.get("/login", function (req, res) {
  res.render("login", { activePage: "login", error: "" });
});

app.post("/login", function (req, res) {
  var sql = "SELECT * FROM user WHERE email = ?";
  var params = [req.body.email];
  var error = "";
  db.get(sql, params, (err, row) => {
    if (err) {
      error = err.message;
    }
    if (row === undefined) {
      error = "Wrong email or password";
    }
    if (error !== "") {
      res.render("login", { activePage: "login", error: error });
      return;
    }

    bcrypt.compare(req.body.password, row["password"], function (err, hashRes) {
      if (hashRes === false) {
        error = "Wrong email or password";
        var data = [req.body.email];
        res.render("login", { activePage: "login", error: error });
        return;
      }

      req.session.userId = row["id"];
      req.session.loggedIn = true;
      res.redirect("/");
    });
  });
});

app.get("/register", function (req, res) {
  res.render("register", { activePage: "register", error: "" });
});

app.post("/register", function (req, res) {
  let error = "";
  const { image } = req.files;
  const imgType = image.mimetype.replace(/image\//g, "");

  if (imgType != "gif" && imgType != "png") {
    error = "Please check file type, it should be png or gif!";
    res.status(400);
    res.render("register", { activePage: "register", error: error });
    return;
  }
  let newImgName = `${uuidv4()}.${imgType}`;

  bcrypt.hash(req.body.password, 10, function (err, hash) {
    var sql =
      "INSERT INTO user (name, surname, avatar_name, email, password) VALUES (?,?,?,?,?)";
    var data = [
      req.body.name,
      req.body.surname,
      newImgName,
      req.body.email,
      hash,
    ];
    db.get(sql, data, function (err, result) {
      if (err) {
        error = "Email already used !";
        res.status(400);
        res.render("register", { activePage: "register", error: error });
        return;
      }

      image.mv(__dirname + `/img/${newImgName}`);
      res.render("login", {
        error: error,
      });
    });
  });
});

app.get("/profile", checkAuth, function (req, res) {
  res.render("profile", { activePage: "profile" });
});

app.post("/profile", function (req, res) {
  bcrypt.hash(req.body.password, 10, function (err, hash) {
    var sql = `UPDATE user SET
    name = COALESCE(?,name),
    email = COALESCE(?,email),
    password = COALESCE(?,password)
    WHERE id = ?`;
    var data = [req.body.name, req.body.email, hash, req.session.userId];
    db.run(sql, data, function (err, result) {
      if (err) {
        res.status(400);
        res.send("database error:" + err.message);
        return;
      }
      res.render("profile_answer", { activePage: "profile" });
    });
  });
});

app.get("/logout", function (req, res) {
  req.session.userId = null;
  req.session.loggedIn = false;
  res.redirect("/login");
});
