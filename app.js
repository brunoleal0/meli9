const fake_meli_token =
  "APP_USR-4576000651843598-082015-37a44c3c4c83277abfb0ee49c13e728d-1375484326";

const express = require("express");
const morgan = require("morgan");
const path = require("path");
const axios = require("axios");
require("dotenv").config();
const session = require("express-session");
const passport = require("passport");
const { Strategy } = require("passport-local");
const { Pool } = require("pg");
// const { type } = require("os");
// const { error } = require("console");
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

// async function teste_query(array_ids) {
//   resposta = await minha_query({
//     texto: "SELECT id FROM public.anuncios WHERE id = ANY($1)",
//     params: [array_ids],
//     nome: "akldspka",
//   });
//   console.log(resposta);
//   return resposta;
// }
// teste_query(["MLB4945040624", "MLB4922063120"]);

// async function joga_erro() {
//   try {
//     const url1 = `https://api.mercadolibre.com/users/${SELLER_ID}/items/search`;
//     const result = await axios.get(url1, {
//       headers: `Authorization: Bearer OKADodak`,
//     });
//   } catch (error) {
//     console.log("joga_erro ERRO", error.response.status);
//     throw error; //NECESSÁRIO
//   }
// }

// app.get("/testaerro", async (req, res) => {
//   console.log("começa");
//   try {
//     const asdf = await joga_erro();
//     console.log("isso não roda");
//   } catch (err) {
//     console.log("quando erra vem p/ k");
//     if (err.response.data.status == 400) {
//       console.log("erro 400");
//     } else {
//       console.log("outro erro", err.response.data.status);
//     }
//     // console.log(err);
//     // console.log(err.statusCode);
//     res.send(err); //funciona
//   }
// });

let array_jsons_frete_apelado = [];
async function puxar_fretes(array_ids) {
  const resposta = [];
  try {
    url = `https://api.mercadolibre.com/users/${SELLER_ID}/shipping_options/free`;
    for (i in array_ids) {
      const resposta_x = await axios.get(url, {
        params: {
          item_id: array_ids[i],
        },
        headers: `Authorization: Bearer ${fake_meli_token}`,
      });
      // if (i == 10) {
      //   const kdadksa = { status: "8932" };
      //   throw kdadksa;
      // }
      console.log(
        `Frete: Loop ${i}: ${resposta_x.data.coverage.all_country.list_cost}`
      );
      array_jsons_frete_apelado.push({
        id: array_ids[i],
        frete: resposta_x.data.coverage.all_country.list_cost,
      });
    }
    // console.log(resposta);
    console.log("frete rodou tudo - impossibru");
    return { resposta, i };
  } catch (error) {
    console.log("Frete: function error");
    // console.log("frete error: ", error);
    // return { resposta, i, error }; //retorna a resposta mesmo qdo dá erro pra poder subir o q der no Database(rate limit não permite rodar a API >250 vezes)
    throw error;
  }
}
// puxar_fretes(["MLB3883535212"]);

app.get("/atualizartablefrete", async (req, res) => {
  var scroll_id_x = [""];
  var product_ids = [];
  const url1 = `https://api.mercadolibre.com/users/${SELLER_ID}/items/search`;
  try {
    const result = await axios.get(url1, {
      headers: `Authorization: Bearer ${fake_meli_token}`,
    });
    for (let i = 0; i < Math.ceil(result.data.paging.total / 100); i++) {
      console.log(`Anúncios: Loop ${i}`);
      const result_x = await axios.get(url1, {
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

    console.log(product_ids_reversed);
    let dict_product_ids_reversed = product_ids_reversed.map((i, y) => ({
      id: product_ids_reversed[y],
    }));
    console.log(dict_product_ids_reversed);

    //Inserindo IDs novos na table de frete
    const inserir = await minha_query({
      texto:
        `INSERT INTO public.fretes (id)` +
        "SELECT id FROM json_populate_recordset (null::fretes, $1)" +
        "ON CONFLICT DO NOTHING",
      params: [JSON.stringify(dict_product_ids_reversed)],
      nome: "inserir",
    });
    console.log(`Frete: Inserção parcial dos IDs ${inserir}`);

    //Selecionando os IDs menor data_atualizacao
    const menos_atualizados = await minha_query({
      texto: `SELECT id FROM public.fretes ORDER BY data_atualizacao ASC, id DESC`,
      nome: "Frete: ids menor data_atualizacao",
    });
    // res.send(menos_atualizados);
    // console.log(menos_atualizados.rows);
    const lista_menos_atualizados = menos_atualizados.rows.map(({ id }) => id);
    // res.send(lista_menos_atualizados);

    await puxar_fretes(lista_menos_atualizados); //os resultados são salvos numa variável global pq n sei se dá pra retornar error E o return da API
    res.send("Frete: rodou sem dar erro 429????");
  } catch (err) {
    console.log("Frete: qdo erra vem pra cá");
    console.log(`Frete: array_jsons_frete_apelado`);
    console.log(array_jsons_frete_apelado);
    if (err.response.data.status == 429) {
      console.log("erro 429: excesso de requisições");
      try {
        const inserir = await minha_query({
          texto:
            `INSERT INTO public.fretes (id,frete)` +
            "SELECT id,frete FROM json_populate_recordset(null::fretes, $1)" +
            "ON CONFLICT(id) DO UPDATE SET frete = EXCLUDED.frete, data_atualizacao=CURRENT_TIMESTAMP(0)-interval '3 hour'",
          params: [JSON.stringify(array_jsons_frete_apelado)],
          nome: "Frete: inserir",
        });
        console.log(`Frete: Inserção parcial dos fretes_apelados`);
        // console.log(inserir);
        const ultima_data_atualizacao = await minha_query({
          texto:
            "SELECT id, data_atualizacao FROM public.fretes WHERE data_atualizacao IN" +
            "(SELECT data_atualizacao FROM public.fretes GROUP BY data_atualizacao LIMIT 1)",
          nome: "Frete: Puxar ultima data_atualizacao",
        });
        // console.log(ultima_data_atualizacao);
        // console.log(ultima_data_atualizacao.rowCount);
        // console.log(ultima_data_atualizacao.rows[0].data_atualizacao);
        // res.send(ultima_data_atualizacao);
        // res.send("adf");
        res.render("home", {
          url_api: `https://api.mercadolibre.com/users/${SELLER_ID}/shipping_options/free?item_id=`,
          resultado_api:
            // `<h2> UHUL1 </h2>` +
            // `A API de fretes do Mercado Livre só permite atualizar por volta de 300 IDs por vez. \n` +
            // `<hr />` +
            // "Table fretes parcialmente atualizada. \n" +
            // "<h2> UHUL2 </h2>" +
            // "<hr />" +
            // `${ultima_data_atualizacao.rowCount} ids têm a mais antiga data de atualização: ${ultima_data_atualizacao.rows[0].data_atualizacao}.` +
            `Clicar novamente no botão para atualizar novamente a table`,
          code: MELI_CODE,
          token: MELI_TOKEN,
        });
      } catch (error2) {
        console.log("Frete: Error2");
        res.send(error2);
      }
    } else {
      console.log("Frete: Erro status:", err.response.data.status);
      res.send(err);
    }
  }
});

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
      console.log(`Anúncios: Loop ${i}`);
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
    res.render("home", {
      url_api: `${url} e https://api.mercadolibre.com/items?`,
      resultado_api: `Anúncios atualizados com sucesso em ${tempo}.`,
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
