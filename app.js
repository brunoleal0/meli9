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
let MELI_TOKEN = "";

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
    res.render("home", {
      content: "API Response.",
      code: MELI_CODE,
      token: MELI_TOKEN,
    });
  } else {
    res.redirect("/?error=senha-incorreta");
  }
});

app.get("/home", (req, res) => {
  try {
    res.render("home", {
      content: JSON.stringify(req.query.code),
      code: JSON.stringify(req.query.code),
      token: MELI_TOKEN,
    });
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

app.get("/meli1", async (req, res) => {
  try {
    res.redirect(MELI_URL_CODE);
  } catch (error) {
    res.render("home", { content: error });
    // res.status(404).send(error.message);
  }
});

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

app.get("/meli2", async (req, res) => {
  try {
    await get_authorization_code()
      .then((result) => {
        console.log("renderiza resultado", result, "renderiza resultado acima");
        MELI_TOKEN = result.data.access_token;
        res.render("home", {
          content: JSON.stringify(result.data),
          code: JSON.stringify(result.data),
          token: MELI_TOKEN,
        });
        // res.render("home", { content: MELI_TOKEN });
      })
      .catch((error) => {
        console.log("renderiza erro");
        res.render("home", {
          content: error,
          code: "",
          token: "",
        });
      });
  } catch {
    console.log("kdsokfsdpfgs");
  }
});

//fazer codigo pra gerar o refresh token

app.get("/pessoais", async (req, res) => {
  try {
    const result = await axios.get("https://api.mercadolibre.com/users/me", {
      headers: `Authorization: Bearer ${MELI_TOKEN}`,
    });
    console.log("asdfvcn result", result.data);
    res.render("home", {
      content: JSON.stringify(result.data),
      code: MELI_CODE,
      token: MELI_TOKEN,
    });
  } catch (error) {
    res.render("home", { content: error, code: MELI_CODE, token: MELI_TOKEN });
  }
});

app.get("/mmpublico", async (req, res) => {
  try {
    const result = await axios.get(
      "https://api.mercadolibre.com/sites/MLB/search?nickname=mais+modelismo",
      {
        headers: `Authorization: Bearer ${MELI_TOKEN}`,
      }
    );
    console.log("fokgo result", result.data);
    res.render("home", {
      content: JSON.stringify(result.data),
      code: MELI_CODE,
      token: MELI_TOKEN,
    });
  } catch (error) {
    res.render("home", { content: error, code: MELI_CODE, token: MELI_TOKEN });
  }
});

app.post("/consultanome", async (req, res) => {
  const { nome_concorrente } = req.body;
  console.log(nome_concorrente);
  try {
    const result = await axios.get(
      `https://api.mercadolibre.com/sites/MLB/search?nickname=${nome_concorrente}`,
      {
        headers: `Authorization: Bearer ${MELI_TOKEN}`,
      }
    );
    // console.log("FSDKPSDFKspFSKFPDKSFPSD", result.data, "result", result);
    res.render("home", {
      content: JSON.stringify(result.data),
      code: MELI_CODE,
      token: MELI_TOKEN,
    });
  } catch (error) {
    res.render("home", { content: error, code: MELI_CODE, token: MELI_TOKEN });
  }
});

app.post("/consultaid", async (req, res) => {
  const { id_concorrente } = req.body;
  console.log(id_concorrente);
  try {
    const result = await axios.get(
      `https://api.mercadolibre.com/users/${id_concorrente}`,
      {
        headers: `Authorization: Bearer ${MELI_TOKEN}`,
      }
    );
    // console.log("PLAKSPDa", result.data, "result", result);
    res.render("home", {
      content: JSON.stringify(result.data),
      code: MELI_CODE,
      token: MELI_TOKEN,
    });
  } catch (error) {
    res.render("home", { content: error, code: MELI_CODE, token: MELI_TOKEN });
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
    res.render("home", {
      content: JSON.stringify(result.data),
      code: MELI_CODE,
      token: MELI_TOKEN,
    });
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
    res.render("home", {
      content: JSON.stringify(result.data),
      code: MELI_CODE,
      token: MELI_TOKEN,
    });
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
    res.render("home", {
      content: JSON.stringify(result.data),
      code: MELI_CODE,
      token: MELI_TOKEN,
    });
  } catch (error) {
    res.status(404).send(error.message);
  }
});

module.exports = app;
