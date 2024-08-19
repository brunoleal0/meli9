const fake_meli_token =
  "APP_USR-4576000651843598-081911-cb45e14d9be80c55574ff0041d56db78-1375484326";

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
  //nao precisa rodar todos os 1100 toda vez, da pra estabelecer uma data/numero e rodar so a partir dela/dele
  const url = `https://api.mercadolibre.com/items?`;
  // const ids_bla = ["MLB4407660484,MLB4457260804"]; //aceita no max 20 itens
  const result = await axios.get(url, {
    params: {
      ids: ids_bla.toString(),
      attributes:
        "id,title,price,permalink,catalog_product_id,attributes.id,attributes.name,attributes.value_name",
      include_attributes: "all",
    },
    headers: `Authorization: Bearer ${fake_meli_token}`,
  });
  //https://stackoverflow.com/questions/49413544/destructuring-array-of-objects-in-es6
  // https://stackoverflow.com/questions/66330228/how-to-destructure-an-array-of-objects-into-multiple-arrays-of-its-keys
  // https://www.udemy.com/course/the-complete-javascript-course/learn/lecture/22648731#overview
  // console.log(Object.values(result.data));
  console.log(JSON.stringify(result.data));
  const { ids, titulos, catalog_product_ids, prices, permalinks, GTINS, SKUS } =
    {
      ids: result.data.map((lixo) => lixo.body.id),
      titulos: result.data.map((lixo) => lixo.body.title),
      catalog_product_ids: result.data.map(
        (lixo) => lixo.body.catalog_product_id
      ),
      prices: result.data.map((lixo) => lixo.body.price),
      permalinks: result.data.map((lixo) => lixo.body.permalink),
      GTINS: result.data.map(function (lixo) {
        for (i in lixo.body.attributes) {
          if (lixo.body.attributes[i].id == "GTIN") {
            console.log(i);
            return lixo.body.attributes[i].value_name;
          } else {
            console.log("GTIN", i);
          }
        }
        return "999";
      }),
      SKUS: result.data.map(function (lixo) {
        for (i in lixo.body.attributes) {
          if (lixo.body.attributes[i].id == "SELLER_SKU") {
            console.log(i);
            return lixo.body.attributes[i].value_name;
          } else {
            console.log("SKU", i);
          }
        }
        return "ERRO";
      }),
    };
  console.log(
    ids,
    titulos,
    catalog_product_ids,
    prices,
    permalinks,
    GTINS,
    SKUS
  );
  return { ids, titulos, catalog_product_ids, prices, permalinks, GTINS, SKUS };
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
const minha_query = async (text, params, callback) => {
  const start = Date.now();
  try {
    const resposta = await pool.query(text, params, callback); //pool.query handla fechar a conexao do cliente
    const end = Date.now();
    const duration = end - start;
    console.log(`sucess query ${duration / 1000}s`);
    return resposta;
  } catch (error) {
    const end = Date.now();
    const duration = end - start;
    console.log(`error query ${duration / 1000}s`);
    return error;
  }
};

app.get("/databasepoolstructure", async (req, res) => {
  const resposta = await minha_query("SELECT * from public.teste");
  console.log(resposta);
  res.send(resposta);
});

app.get("/atualizatabela", async (req, res) => {
  // const id = "107585822"; //Pessoal
  const id = "1375484326"; //MM
  const url = `https://api.mercadolibre.com/users/${id}/items/search`;
  var scroll_id_x = [""];
  var product_ids = [];
  try {
    const result = await axios.get(url, {
      headers: `Authorization: Bearer ${fake_meli_token}`,
    });
    // console.log(`deu certo ${JSON.stringify(result.data)}`);
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
      console.log(result_x.data.results);
      scroll_id_x.push(result_x.data.scroll_id);
      product_ids.push(...result_x.data.results); //https://stackoverflow.com/questions/1374126/how-to-extend-an-existing-javascript-array-with-another-array-without-creating
    }
    // console.log(scroll_id_x);
    // console.log(product_ids);
    product_ids.sort().reverse();
    const lixo = await atributos(product_ids.slice(0, 20)); //tem que escolher o slice certo automaticamente <- a API so da 20 resultados
    console.log("********************************************", lixo);
    var lixo_json = await lixo.ids.map((id, i) => ({
      id,
      titulo: lixo.titulos[i],
      catalog_product_id: lixo.catalog_product_ids[i],
      price: ~~(lixo.prices[i] * 100), //https://stackoverflow.com/questions/34077449/fastest-way-to-cast-a-float-to-an-int-in-javascript
      permalink: lixo.permalinks[i],
      gtin: lixo.GTINS[i],
      sku: lixo.SKUS[i],
    }));
    const resposta = await minha_query(
      `INSERT INTO public.anuncios (id,titulo,catalog_product_id,price,permalink,gtin,sku)` +
        "SELECT id,titulo,catalog_product_id,price,permalink,gtin,sku FROM json_populate_recordset(null::anuncios, $1)",
      [JSON.stringify(lixo_json)],
      function (err, asdf) {
        if (err) {
          console.log("ERRO: DASPFspfkDSPFGSkfsdf", err);
          res.render("home", {
            url_api: url,
            resultado_api: JSON.stringify(err),
            code: MELI_CODE,
            token: MELI_TOKEN,
          });
        } else {
          // res.send(resposta);
          console.log(resposta);
          res.render("home", {
            url_api: url,
            resultado_api: "Banco de dados atualizado com sucesso.",
            code: MELI_CODE,
            token: MELI_TOKEN,
          });
        }
      }
    );
  } catch (error) {
    console.log(error);
    res.render("home", {
      url_api: url,
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
