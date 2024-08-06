// import express from "express";
const express = require("express");
// import morgan from "morgan";
const morgan = require("morgan");
const path = require("path");
const axios = require("axios");
// const fetch = require("node-fetch");
require("dotenv").config();

const app = express();
// const port = 3000;
const API_URL = "https://secrets-api.appbrewery.com";
const yourUsername = "hansel000";
const yourPassword = "IAmTheBest";
const yourAPIKey = "88dd1c8c-2438-4243-a772-19caf7c70673";
const yourBearerToken = "40db8752-7f74-4de7-b10a-79275e542b7f";
const { CLIENT_ID, CLIENT_SECRET, SYS_PWD, REDIRECT_URI } = process.env;

// const meli_id = "4576000651843598";
// const meli_secret_key = "3bIX0wSt8GELyV9rUnHpqkGaz2ScNZ41";
// const meli_redirect_url = "https://meli9-a72d777c8ad8.herokuapp.com/home";
const MELI_URL_CODE = `https://auth.mercadolivre.com.br/authorization?response_type=code&client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}`;
const MELI_URL_TOKEN = `https://api.mercadolibre.com/oauth/token`;
let MELI_CODE = "";

app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

app.use(express.urlencoded({ extended: false }));

app.use(morgan("combined"));

app.get("/", (req, res) => {
  res.render("index");
});

app.post("/login", (req, res) => {
  if (req.body.password === SYS_PWD) {
    // req.session.user = true;
    res.render("home", { content: "API Response." });
  } else {
    res.redirect("/?error=senha-incorreta");
  }
});

app.get("/home", (req, res) => {
  try {
    res.render("home", { content: JSON.stringify(req.query.code) });
    MELI_CODE = req.query.code;
    // res.render("home", { content: "API Response." });
  } catch (err) {
    console.log("Algo deu errado =/", err);
    res.status(500).send(`Error! ${err}`);
  }
});

// app.get("/meli1", async (req, res) => {
//   try {
//     const result = await axios.get(MELI_URL_CODE);
//     res.render("home", { content: JSON.stringify(result.data) });
//     console.log(res);
//   } catch (error) {
//     res.render("home", { content: error });
//     // res.status(404).send(error.message);
//   }
// });

app.get("/meli2", async (req, res) => {
  try {
    res.redirect(MELI_URL_CODE);
  } catch (error) {
    res.render("home", { content: error });
    // res.status(404).send(error.message);
  }
});

app.get("/meli3", async (req, res) => {
  const dados = `grant_type=authorization_code&client_id=${CLIENT_ID}&client_secret=${CLIENT_SECRET}&code=${MELI_CODE}&redirect_uri=${REDIRECT_URI}`;
  const customHeaders = {
    "content-type": "application/x-www-form-urlencoded",
    accept: "application/json",
  };
  const bla = await axios
    .post(MELI_URL_TOKEN, dados, {
      headers: customHeaders,
    })
    .then(({ data }) => {
      // console.log(data);
      const MELI_ACESS_TOKEN = data;
      console.log("asdf", data, typeof data); //ERRROOOOOOOOOOOOOOOOOOOOOO
      console.log("MELI_ACESS_TOKEN", MELI_ACESS_TOKEN);
    })
    .catch((error) => {
      console.error(error);
    });
  // console.log("bla", bla);
});

// const MELI_CODE = "TG-66b210dce6a43700019b7025-107585822";

async function get_authorization_code() {
  console.log("rodando a budega");
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
        console.log("data", response, "data acima");
        return resolve(response);
      })
      .catch((error) => {
        console.log("deu ruim", error, "deu ruim acima");
        return reject(error);
      });
  });
}

app.get("/meli4", async (req, res) => {
  try {
    await get_authorization_code()
      .then((result) => {
        console.log("renderiza resultado", result, "renderiza resultado acima");
        res.render("home", { content: JSON.stringify(result.data) });
      })
      .catch((error) => {
        console.log("renderiza erro");
        res.render("home", { content: error });
      });
  } catch {
    console.log("kdsokfsdpfgs");
  }
});

app.get("/noAuth", async (req, res) => {
  try {
    const result = await axios.get(API_URL + "/random");
    console.log(res);
    res.render("home", { content: JSON.stringify(result.data) });
  } catch (error) {
    res.status(404).send(error.message);
  }
});

app.get("/basicAuth", async (req, res) => {
  try {
    const result = await axios.get(API_URL + "/all?page=2", {
      auth: {
        username: yourUsername,
        password: yourPassword,
      },
    });
    res.render("home", { content: JSON.stringify(result.data) });
  } catch (error) {
    res.status(404).send(error.message);
  }
});

app.get("/apiKey", async (req, res) => {
  try {
    const result = await axios.get(API_URL + "/filter", {
      params: {
        score: 5,
        apiKey: yourAPIKey,
      },
    });
    res.render("home", { content: JSON.stringify(result.data) });
  } catch (error) {
    res.status(404).send(error.message);
  }
});

const config = {
  headers: { Authorization: `Bearer ${yourBearerToken}` },
};

app.get("/bearerToken", async (req, res) => {
  try {
    const result = await axios.get(API_URL + "/secrets/2", config);
    res.render("home", { content: JSON.stringify(result.data) });
  } catch (error) {
    res.status(404).send(error.message);
  }
});

module.exports = app;
