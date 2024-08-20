const fake_meli_token =
  "APP_USR-4576000651843598-081917-aa530283ef6402e832feb1a5d014439e-1375484326";

const express = require("express");
const morgan = require("morgan");
const path = require("path");
const axios = require("axios");
require("dotenv").config();
const session = require("express-session");
const passport = require("passport");
const { Strategy } = require("passport-local");
const { Pool, Client } = require("pg");
const {
  CLIENT_ID,
  CLIENT_SECRET,
  SYS_PWD,
  REDIRECT_URI,
  COOKIE_SECRET,
  SELLER_ID,
  DB_USERNAME,
  DB_HOST,
  DB_DATABASE,
  DB_PASSWORD,
  DB_PORT,
} = process.env;
const MELI_URL_CODE = `https://auth.mercadolivre.com.br/authorization?response_type=code&client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}`;
const MELI_URL_TOKEN = `https://api.mercadolibre.com/oauth/token`;
let MELI_CODE = "";
let MELI_TOKEN = "";
const pool = new Pool({
  user: DB_USERNAME,
  host: DB_HOST,
  database: DB_DATABASE,
  password: DB_PASSWORD,
  port: DB_PORT,
  ssl: {
    require: true,
    rejectUnauthorized: false,
  },
});
const app = express();

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
    } catch (err) {
      res.status(500).send(`Error! ${err}`);
    }
  } else {
    res.redirect("/");
  }
});

app.get("/getcode", async (req, res) => {
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

async function atributos(ids_bla) {
  const url = `https://api.mercadolibre.com/items?`;
  const result = await axios.get(url, {
    params: {
      ids: ids_bla.toString(),
      attributes:
        "id,title,price,permalink,available_quantity,sold_quantity,date_created,last_updated,catalog_product_id,attributes.id,attributes.name,attributes.value_name",
      include_attributes: "all",
      // include_internal_attributes: true,
    },
    headers: `Authorization: Bearer ${fake_meli_token}`,
  });
  //https://stackoverflow.com/questions/49413544/destructuring-array-of-objects-in-es6
  // https://stackoverflow.com/questions/66330228/how-to-destructure-an-array-of-objects-into-multiple-arrays-of-its-keys
  // https://www.udemy.com/course/the-complete-javascript-course/learn/lecture/22648731#overview
  // console.log(Object.values(result.data));
  // console.log("atributos: ", JSON.stringify(result.data));
  const {
    ids,
    titulos,
    catalog_product_ids,
    prices,
    permalinks,
    available_quantity,
    sold_quantity,
    date_created,
    last_updated,
    GTINS,
    SKUS,
  } = {
    ids: result.data.map((lixo) => lixo.body.id),
    titulos: result.data.map((lixo) => lixo.body.title),
    catalog_product_ids: result.data.map(
      (lixo) => lixo.body.catalog_product_id
    ),
    prices: result.data.map((lixo) => lixo.body.price),
    permalinks: result.data.map((lixo) => lixo.body.permalink),
    available_quantity: result.data.map((lixo) => lixo.body.available_quantity),
    sold_quantity: result.data.map((lixo) => lixo.body.sold_quantity),
    date_created: result.data.map((lixo) => lixo.body.date_created),
    last_updated: result.data.map((lixo) => lixo.body.last_updated),
    GTINS: result.data.map(function (lixo) {
      for (i in lixo.body.attributes) {
        if (lixo.body.attributes[i].id == "GTIN") {
          return lixo.body.attributes[i].value_name;
        } else {
          // console.log("GTIN", i);
        }
      }
      return "999";
    }),
    SKUS: result.data.map(function (lixo) {
      for (i in lixo.body.attributes) {
        if (lixo.body.attributes[i].id == "SELLER_SKU") {
          return lixo.body.attributes[i].value_name;
        } else {
          // console.log("SKU", i);
        }
      }
      return "ERRO";
    }),
  };
  // console.log(
  // ids,
  //   titulos,
  //   catalog_product_ids,
  //   prices,
  //   permalinks,
  // available_quantity
  // sold_quantity,
  //   GTINS,
  //   SKUS
  // );
  return {
    ids,
    titulos,
    catalog_product_ids,
    prices,
    permalinks,
    available_quantity,
    sold_quantity,
    date_created,
    last_updated,
    GTINS,
    SKUS,
  };
}

app.post("/vendas", async (req, res) => {
  const { offset } = req.body;
  const url = `https://api.mercadolibre.com/orders/search?seller=${SELLER_ID}`;
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

app.post("/consultauser", async (req, res) => {
  if (req.isAuthenticated()) {
    const { user } = req.body;
    if (!Number.isNaN(Number(user))) {
      url = `https://api.mercadolibre.com/users/${user}`;
    } else {
      url = `https://api.mercadolibre.com/sites/MLB/search?nickname=${user}`;
    }
    try {
      const result = await axios.get(url);
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

app.post("/consultaseller", async (req, res) => {
  if (req.isAuthenticated()) {
    const { seller } = req.body;
    url = `https://api.mercadolibre.com/sites/MLB/search?seller_id=${seller}`;
    try {
      const result = await axios.get(url);
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

// https://node-postgres.com/guides/project-structure
async function minha_query({ texto, params, nome = "sem_nome", callback }) {
  const start = Date.now();
  try {
    const resposta = await pool.query(texto, params, callback); //pool.query handla fechar a conexao do cliente
    const end = Date.now();
    const duration = end - start;
    console.log(`sucess query ${nome}: ${duration / 1000}s`);
    return resposta;
  } catch (error) {
    const end = Date.now();
    const duration = end - start;
    console.log(`error query ${nome}: ${duration / 1000}s`);
    return error;
  }
}

async function puxar_fretes(array_ids) {
  try {
    url = `https://api.mercadolibre.com/users/${SELLER_ID}/shipping_options/free`;
    const resposta = [];
    for (i in array_ids) {
      // console.log(i);
      const resposta_x = await axios.get(url, {
        params: {
          item_id: array_ids[i],
        },
        headers: `Authorization: Bearer ${fake_meli_token}`,
      });
      console.log(
        `frete ${i}: ${resposta_x.data.coverage.all_country.list_cost}`
      );
      resposta.push({
        id: array_ids[i],
        frete: resposta_x.data.coverage.all_country.list_cost,
      });
    }
    console.log(resposta);
    // console.log("frete OK");
    return resposta;
  } catch (error) {
    console.log("frete error: ", error);
    return error;
  }
}
puxar_fretes(["MLB3883535212"]);

// Juntar 2 JSONS baseado na chave
// const a_json = [
//   { id: "KDSAopdakso", fruta: "banana", nome: "bruno" },
//   { id: "ASKPDOAK", fruta: "melancia", nome: "camila" },
// ];
// const b_json = [
//   { id: "KDSAopdakso", sobrenome: "leal" },
//   { id: "ASKPDOAK", sobrenome: "hennies" },
// ];
// // var DASKdsaKASDO = { ...a_json[0], ...b_json[0] };
// var DASKdsaKASDO = a_json.map((x, i) => {
//   return { ...a_json[i], ...b_json[i] };
// });
// console.log(DASKdsaKASDO);

app.get("/anunciosdropcreateinserttable", async (req, res) => {
  const url = `https://api.mercadolibre.com/users/${SELLER_ID}/items/search`;
  var scroll_id_x = [""];
  var product_ids = [];
  let lixo_lista_jsons_agregado = [];
  try {
    const result = await axios.get(url, {
      headers: `Authorization: Bearer ${fake_meli_token}`,
    });
    for (let i = 0; i < Math.ceil(result.data.paging.total / 100); i++) {
      console.log(`Loop ${i}`);
      const result_x = await axios.get(url, {
        params: {
          search_type: "scan",
          limit: "100",
          scroll_id: scroll_id_x[i], //na prática é como se puxasse de i-1 pq scroll_id_x[0] ja eh iniciado com o valor "" antes da primeira iteracao
        },
        headers: `Authorization: Bearer ${fake_meli_token}`,
      });
      scroll_id_x.push(result_x.data.scroll_id);
      product_ids.push(...result_x.data.results); //https://stackoverflow.com/questions/1374126/how-to-extend-an-existing-javascript-array-with-another-array-without-creating
    }
    product_ids_reversed = product_ids.sort().toReversed();
    // loop de 20 em 20 de 0 ate 1167
    // console.log(product_ids_reversed);
    for (let i = 0; i < Math.ceil(product_ids_reversed.length / 20); i++) {
      console.log(`atributos ${i}`);
      const lixo = await atributos(
        product_ids_reversed.slice(i * 20, (i + 1) * 20) //end not included
      );
      // console.log("********************************************", lixo);
      var lixo_lista_jsons = await lixo.ids.map((id, x) => ({
        id,
        titulo: lixo.titulos[x],
        catalog_product_id: lixo.catalog_product_ids[x],
        price: ~~(lixo.prices[x] * 100), //https://stackoverflow.com/questions/34077449/fastest-way-to-cast-a-float-to-an-int-in-javascript
        permalink: lixo.permalinks[x],
        available_quantity: ~~lixo.available_quantity[x],
        sold_quantity: ~~lixo.sold_quantity[x],
        date_created: lixo.date_created[x],
        last_updated: lixo.last_updated[x],
        gtin: lixo.GTINS[x],
        sku: lixo.SKUS[x],
      }));
      // console.log(
      //   "lixo_lista_jsons******************************************************************************************************",
      //   lixo_lista_jsons
      // );
      lixo_lista_jsons_agregado.push(...lixo_lista_jsons);
    }
    console.log(
      "lixo_lista_jsons_agregado************************************************************************************************",
      lixo_lista_jsons_agregado
    );

    // DROPA;
    const drop = await minha_query({
      texto: "DROP TABLE IF EXISTS public.anuncios",
      nome: "drop",
    });
    console.log(`Drop ${drop}`);

    // CREATE;
    const create = await minha_query({
      texto: `create table anuncios (
              id VARCHAR(100),
              titulo VARCHAR(200),
              catalog_product_id VARCHAR(100),
              price INT,
              permalink VARCHAR(200),
              available_quantity INT,
              sold_quantity INT,
              date_created TIMESTAMPTZ,
              last_updated TIMESTAMPTZ,
              gtin VARCHAR(100),
              sku VARCHAR(100),
              data_atualizacao TIMESTAMP(0) DEFAULT (CURRENT_TIMESTAMP(0)-interval '3 hour')
              )`,
      nome: "create",
    });
    console.log(`Create ${create}`);

    // Insere
    const inserir = await minha_query({
      texto:
        `INSERT INTO public.anuncios (id,titulo,catalog_product_id,price,permalink,available_quantity,sold_quantity,date_created,last_updated,gtin,sku)` +
        "SELECT id,titulo,catalog_product_id,price,permalink,available_quantity,sold_quantity,date_created,last_updated,gtin,sku FROM json_populate_recordset(null::anuncios, $1)",
      params: [JSON.stringify(lixo_lista_jsons_agregado)],
      nome: "inserir",
    });
    console.log(`Inserção ${inserir}`);

    const agora = new Date();
    const tempo = `${
      (agora.getUTCHours() - 3 < 10 ? "0" : "") + (agora.getUTCHours() - 3)
    }:${(agora.getUTCMinutes() < 10 ? "0" : "") + agora.getUTCMinutes()}:${
      (agora.getUTCSeconds() < 10 ? "0" : "") + agora.getUTCSeconds()
    }`;
    // res.send(`Table de Anúncios atualizada com sucesso em ${tempo}.`);
    res.render("home", {
      url_api: `${url} e https://api.mercadolibre.com/items?`,
      resultado_api: `Últimos 20 Anúncios atualizados com sucesso em ${tempo}.`,
      code: MELI_CODE,
      token: MELI_TOKEN,
    });
  } catch (error) {
    console.log(error);
    res.render("home", {
      url_api: `${url} e https://api.mercadolibre.com/items?`,
      resultado_api: error,
      code: "",
      token: "",
    });
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
