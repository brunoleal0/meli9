// import express from "express";
const express = require("express");
// import morgan from "morgan";
const morgan = require("morgan");
const path = require("path");
const axios = require("axios");
// const fetch = require("node-fetch");
require("dotenv").config();
const session = require("express-session");
const passport = require("passport");
const { Strategy } = require("passport-local");

const app = express();
const {
  CLIENT_ID,
  CLIENT_SECRET,
  SYS_PWD,
  REDIRECT_URI,
  COOKIE_SECRET,
  SELLER_ID,
} = process.env;

const MELI_URL_CODE = `https://auth.mercadolivre.com.br/authorization?response_type=code&client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}`;
const MELI_URL_TOKEN = `https://api.mercadolibre.com/oauth/token`;
let MELI_CODE = " ";
let MELI_TOKEN = " ";

app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

app.use(express.urlencoded({ extended: false }));

app.use(morgan("combined"));

app.use(
  session({
    secret: COOKIE_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: {
      maxAge: 1000 * 60 * 60 * 12,
    },
  })
);
app.use(passport.initialize());
app.use(passport.session());

app.get("/", (req, res) => {
  res.render("index");
});

app.post(
  "/login",
  passport.authenticate("local", {
    successRedirect: "/home",
    failureRedirect: "/",
  })
);

app.get("/home", (req, res) => {
  //console.log(req.isAuthenticated());
  console.log(req.user);
  if (req.isAuthenticated()) {
    try {
      res.render("home", {
        url_api: `https://auth.mercadolivre.com.br/authorization?response_type=code&client_id=$APP_ID&redirect_uri=$YOUR_URL`,
        resultado_api: JSON.stringify(req.query.code),
        code: req.query.code,
        token: MELI_TOKEN,
      });
      MELI_CODE = req.query.code;
      // res.render("home", { resultado_api: "API Response." });
    } catch (err) {
      res.status(500).send(`Error! ${err}`);
    }
  } else {
    res.redirect("/");
  }
});

app.get("/getcode", async (req, res) => {
  //console.log(req.isAuthenticated());
  if (req.isAuthenticated()) {
    try {
      res.redirect(MELI_URL_CODE);
    } catch (error) {
      res.render("home", { resultado_api: error });
    }
  } else {
    res.redirect("/");
  }
});

async function get_authorization_code() {
  const dados = `grant_type=authorization_code&client_id=${CLIENT_ID}&client_secret=${CLIENT_SECRET}&code=${MELI_CODE}&redirect_uri=${REDIRECT_URI}`;
  const customHeaders = {
    "content-type": "application/x-www-form-urlencoded",
    accept: "application/json",
  };
  return new Promise((resolve, reject) => {
    axios
      .post(MELI_URL_TOKEN, dados, {
        headers: customHeaders,
      })
      .then((response) => {
        return resolve(response);
      })
      .catch((error) => {
        return reject(error);
      });
  });
}

app.get("/gettoken", async (req, res) => {
  //console.log(req.isAuthenticated());
  if (req.isAuthenticated()) {
    const url = MELI_URL_TOKEN;
    try {
      await get_authorization_code()
        .then((result) => {
          MELI_TOKEN = result.data.access_token;
          res.render("home", {
            url_api: url,
            resultado_api: JSON.stringify(result.data),
            code: MELI_CODE,
            token: MELI_TOKEN,
          });
        })
        .catch((error) => {
          res.render("home", {
            url_api: url,
            resultado_api: error,
            code: "",
            token: "",
          });
        });
    } catch (error) {
      console.log("FSDkosdgkjoa", error);
    }
  } else {
    res.redirect("/");
  }
});

app.get("/mmpublico", async (req, res) => {
  //console.log(req.isAuthenticated());
  if (req.isAuthenticated()) {
    const url =
      "https://api.mercadolibre.com/sites/MLB/search?nickname=mais+modelismo";
    try {
      const result = await axios.get(url, {
        headers: `Authorization: Bearer ${MELI_TOKEN}`,
      });
      res.render("home", {
        url_api: url,
        resultado_api: JSON.stringify(result.data),
        code: MELI_CODE,
        token: MELI_TOKEN,
      });
    } catch (error) {
      res.render("home", {
        url_api: url,
        resultado_api: error,
        code: "",
        token: "",
      });
    }
  } else {
    res.redirect("/");
  }
});

app.get("/pessoais", async (req, res) => {
  //console.log(req.isAuthenticated());
  if (req.isAuthenticated()) {
    const url = "https://api.mercadolibre.com/users/me";
    try {
      const result = await axios.get(url, {
        headers: `Authorization: Bearer ${MELI_TOKEN}`,
      });
      res.render("home", {
        url_api: url,
        resultado_api: JSON.stringify(result.data),
        code: MELI_CODE,
        token: MELI_TOKEN,
      });
    } catch (error) {
      res.render("home", {
        url_api: url,
        resultado_api: error,
        code: "",
        token: "",
      });
    }
  } else {
    res.redirect("/");
  }
});

app.post("/pedidos", async (req, res) => {
  const { offset } = req.body;
  const url = `https://api.mercadolibre.com/orders/search?seller=${SELLER_ID}`;
  const fake_meli_token =
    "APP_USR-4576000651843598-081413-5acd90eefae966abc687207fe9f8e3ca-1375484326";
  try {
    console.log("tentei");
    const result = await axios.get(url, {
      params: {
        offset: offset,
        limit: "51",
        sort: "date_desc",
      },
      headers: `Authorization: Bearer ${fake_meli_token}`,
    });
    res.render("home", {
      url_api: url,
      resultado_api: JSON.stringify(result.data),
      code: MELI_CODE,
      token: MELI_TOKEN,
    });
  } catch (error) {
    res.render("home", {
      url_api: url,
      resultado_api: error,
      code: "",
      token: "",
    });
  }
});

app.post("/consultanome", async (req, res) => {
  //console.log(req.isAuthenticated());
  if (req.isAuthenticated()) {
    const { nome } = req.body;
    const url = `https://api.mercadolibre.com/sites/MLB/search?nickname=${nome}`;
    try {
      const result = await axios.get(url, {
        headers: `Authorization: Bearer ${MELI_TOKEN}`,
      });
      res.render("home", {
        url_api: url,
        resultado_api: JSON.stringify(result.data),
        code: MELI_CODE,
        token: MELI_TOKEN,
      });
    } catch (error) {
      res.render("home", {
        url_api: url,
        resultado_api: error,
        code: "",
        token: "",
      });
    }
  } else {
    res.redirect("/");
  }
});

app.post("/consultaid", async (req, res) => {
  //console.log(req.isAuthenticated());
  if (req.isAuthenticated()) {
    const { id } = req.body;
    const url = `https://api.mercadolibre.com/users/${id}`;
    try {
      const result = await axios.get(url, {
        headers: `Authorization: Bearer ${MELI_TOKEN}`,
      });
      res.render("home", {
        url_api: url,
        resultado_api: JSON.stringify(result.data),
        code: MELI_CODE,
        token: MELI_TOKEN,
      });
    } catch (error) {
      res.render("home", {
        url_api: url,
        resultado_api: error,
        code: "",
        token: "",
      });
    }
  } else {
    res.redirect("/");
  }
});

app.get("/lista_de_produtos", async (req, res) => {
  if (req.isAuthenticated()) {
    const id = "107585822";
    const url = `https://api.mercadolibre.com/users/${id}/items/search`;
    try {
      ("DKOSAKDaODKA");
    } catch (error) {
      res.render("home", {
        url_api: url,
        resultado_api: error,
        code: "",
        token: "",
      });
    }
  } else {
    res.redirect("/");
  }
});

app.get("/teste", async (req, res) => {
  // const id = "107585822"; //Pessoal
  const id = "1375484326"; //MM
  const url = `https://api.mercadolibre.com/users/${id}/items/search`;
  const fake_meli_token =
    "APP_USR-4576000651843598-081413-5acd90eefae966abc687207fe9f8e3ca-1375484326";
  var scroll_id_x = [""];
  var product_ids = [];
  try {
    const result = await axios.get(url, {
      headers: `Authorization: Bearer ${fake_meli_token}`,
    });
    console.log(`deu certo ${JSON.stringify(result.data)}`);
    for (let i = 0; i < Math.ceil(result.data.paging.total / 100); i++) {
      //nao pega de 1000 pra cima
      console.log(`Loop ${i}`);
      const result_x = await axios.get(url, {
        params: {
          search_type: "scan",
          offset: "0",
          limit: "100",
          scroll_id: scroll_id_x[i],
        },
        headers: `Authorization: Bearer ${fake_meli_token}`,
      });
      console.log(i);
      console.log(`scroll id${i}: ${result_x.data.scroll_id}`);
      scroll_id_x.push(result_x.data.scroll_id);
      product_ids.push(...result_x.data.results); //https://stackoverflow.com/questions/1374126/how-to-extend-an-existing-javascript-array-with-another-array-without-creating
    }
    console.log(scroll_id_x);
    console.log(product_ids);
    res.send(result.data);
  } catch (error) {
    console.log(`deu errado: ${error}`);
    res.send(error);
  }
});

// This function NEEDS to have both username and password as FILLED INPUTS in INDEX.EJS
passport.use(
  new Strategy(async function verify(username, password, callback) {
    try {
      console.log(password);
      if (password === SYS_PWD) {
        console.log("senha correta");
        const user = "Camilinda";
        return callback(null, user);
      } else {
        console.log("senha errada");
        return callback(null, false);
      }
    } catch (error) {
      console.log("dasdas", error);
    }
  })
);

passport.serializeUser((user, callback) => {
  callback(null, user);
});

passport.deserializeUser((user, callback) => {
  callback(null, user);
});

module.exports = app;
