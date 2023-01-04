// Structure of app.js file
// Dependencies
// Configuration for server
// Function for auth users
// Routes (get / post)
// ->Routes for nav line
// --->Routes for post
// ->Routes for nav line (continue)

const express = require("express");
const app = express();
const db = require("./database.js");
const bcrypt = require("bcrypt");
const session = require("express-session");
const path = require("path");

// Configuration for server
app.set("view engine", "ejs");
app.set("views", [
  path.join(__dirname, "views"),
  path.join(__dirname, "views/patials/"),
]);

app.use(
  session({
    secret: "randomly generated secret",
  })
);
app.use("/css", express.static(__dirname + "/css"));
app.use(
  "/bootstrap",
  express.static(__dirname + "/node_modules/bootstrap/dist")
);
app.use("/jquery", express.static(__dirname + "/node_modules/jquery/dist/"));
app.use(express.urlencoded());
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
app.get("/", function (req, res) {
  res.render("index", { activePage: "home" });
});

app.get("/posts", function (req, res) {
  let sql = "SELECT * FROM post";
  db.all(sql, [], (err, rows) => {
    if (err) {
      res.status(400);
      res.send("database error:" + err.message);
      return;
    }
    res.render("posts", { activePage: "posts", posts: rows });
  });
});

// ---> Routes for pages in posts (get / post)
app.get("/new_post", function (req, res) {
  res.render("post/new_post", { activePage: "new_post" });
});

app.post("/new_post", function (req, res) {
  var data = [
    req.body.title,
    req.body.author,
    req.body.category,
    req.body.body,
  ];
  var sql = "INSERT INTO post (title, author, category, body) VALUES (?,?,?,?)";
  db.run(sql, data, function (err, result) {
    if (err) {
      res.status(400);
      res.send("database error:" + err.message);
      return;
    }
    res.render("post/new_post_answer", {
      activePage: "new_post",
      formData: req.body,
    });
  });
});

app.get("/posts/:id/show", function (req, res) {
  var sql = "SELECT * FROM post WHERE id = ?";
  var params = [req.params.id];

  var sql_comment = "SELECT * FROM comment WHERE post_id = ?";

  db.get(sql, params, (err, post_row) => {
    if (err) {
      res.status(400);
      res.send("database error:" + err.message);
      return;
    }

    db.all(sql_comment, params, (err, comment_row) => {
      if (err) {
        res.status(400);
        res.send("database error:" + err.message);
        return;
      }

      res.render("post/show_post", {
        post: post_row,
        comment: comment_row,
        activePage: "posts",
      });
    });
  });
});

app.post("/posts/:id/show", function (req, res) {
  var data = [req.body.author, req.body.message, req.params.id];
  var sql = "INSERT INTO comment (author, message, post_id) VALUES (?,?,?)";
  db.run(sql, data, function (err, result) {
    if (err) {
      res.status(400);
      res.send("database error:" + err.message);
      return;
    }
    res.redirect("/posts/" + req.params.id + "/show");
  });
});

app.get("/posts/:id/edit", function (req, res) {
  var sql = "SELECT * FROM post WHERE id = ?";
  var params = [req.params.id];
  db.get(sql, params, (err, row) => {
    if (err) {
      res.status(400);
      res.send("database error:" + err.message);
      return;
    }
    res.render("post/edit_post", { post: row, activePage: "posts" });
  });
});

app.post("/posts/:id/edit", function (req, res) {
  var data = [
    req.body.title,
    req.body.author,
    req.body.category,
    req.body.body,
    req.params.id,
  ];
  db.run(
    `UPDATE post SET
 title = COALESCE(?,title),
 author = COALESCE(?,author),
 category = COALESCE(?,category),
 body = COALESCE(?,body)
 WHERE id = ?`,
    data,
    function (err, result) {
      if (err) {
        res.status(400);
        res.send("database error:" + err.message);
        return;
      }
      res.redirect("/posts");
    }
  );
});

app.get("/posts/:id/delete", function (req, res) {
  var sql = "DELETE FROM post WHERE id = ?";
  var params = [req.params.id];
  db.get(sql, params, (err, row) => {
    if (err) {
      res.status(400);
      res.send("database error:" + err.message);
      return;
    }
    res.redirect("/posts");
  });
});
// ---> End of routes for pages in posts

app.get("/contact", function (req, res) {
  res.render("contact", { activePage: "contact" });
});

app.post("/contact", function (req, res) {
  res.render("contact_answer", { activePage: "contact", formData: req.body });
});

app.get("/login", function (req, res) {
  res.render("login", { activePage: "login", error: "" });
});

app.post("/login", function (req, res) {
  var sql = "SELECT * FROM user WHERE email = ?";
  var params = [req.body.email];
  var error = "";
  db.get(sql, params, (err, row) => {
    console.log(row);
    if (err) {
      error = err.message;
    }
    if (row === undefined) {
      error = "Wrong email or password";
    }
    if (row["failed_logins"] + 1 === 3) {
      error = "Your account blocked";
    }
    if (error !== "") {
      res.render("login", { activePage: "login", error: error });
      return;
    }

    bcrypt.compare(req.body.password, row["password"], function (err, hashRes) {
      if (hashRes === false) {
        error = "Wrong email or password";
        let failed_count = Number(row["failed_logins"]) + 1;
        var data = [failed_count, req.body.email];
        db.run(
          `UPDATE user SET failed_logins = ? WHERE email = ?`,
          data,
          function (err, result) {
            if (err) {
              res.status(400);
              res.send("database error:" + err.message);
              return;
            }
          }
        );

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
  bcrypt.hash(req.body.password, 10, function (err, hash) {
    var sql =
      "INSERT INTO user (name, email, password, failed_logins) VALUES (?,?,?,0)";
    var data = [req.body.name, req.body.email, hash];
    db.run(sql, data, function (err, result) {
      if (err) {
        error = "Email already used !";
        res.status(400);
        res.render("register", { activePage: "register", error: error });
        return;
      }
      res.render("user/register_answer", {
        activePage: "register",
        formData: req.body,
        error: error,
      });
    });
  });
});

app.get("/profile", checkAuth, function (req, res) {
  res.render("profile", { activePage: "profile" });
});

app.post("/profile", checkAuth, function (req, res) {
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
      res.render("user/profile_answer", { activePage: "profile" });
    });
  });
});

app.get("/logout", function (req, res) {
  req.session.userId = null;
  req.session.loggedIn = false;
  res.redirect("/login");
});

app.listen(3000);
