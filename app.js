console.log("heroku logs --app=meli9 --tail"); //pra ver os logs do heroku
// nodemon ./bin/www

// const fake_meli_token =
//   "APP_USR-4576000651843598-0921-1375484326";
const express = require("express");
const morgan = require("morgan");
const path = require("path");
const axios = require("axios");
require("dotenv").config();
const session = require("express-session");
const passport = require("passport");
const { Strategy } = require("passport-local");
const { Pool } = require("pg");
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
app.use(express.static("public"));
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

app.get("/error", (req, res) => {
  res.render("error");
});

app.post(
  "/login",
  passport.authenticate("local", {
    successRedirect: "/home",
    failureRedirect: "/error",
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
      console.log(error, "GetCode: Error FINAL");
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
          console.log(error, "GetToken: Error FINAL");
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
      console.log(error, "MMPublico: Error FINAL");
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
      console.log(error, "Pessoais: Error FINAL");
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
        "id,title,price,permalink,available_quantity,sold_quantity,status,sub_status,date_created,last_updated,catalog_product_id,attributes.id,attributes.name,attributes.value_name,shipping.free_shipping,shipping.tags",
      include_attributes: "all",
      // include_internal_attributes: true,
    },
    headers: `Authorization: Bearer ${MELI_TOKEN}`,
  });
  // https://stackoverflow.com/questions/49413544/destructuring-array-of-objects-in-es6
  // https://stackoverflow.com/questions/66330228/how-to-destructure-an-array-of-objects-into-multiple-arrays-of-its-keys
  // https://www.udemy.com/course/the-complete-javascript-course/learn/lecture/22648731#overview
  // console.log("atributos: ", JSON.stringify(result.data));
  const {
    ids,
    titulos,
    catalog_product_ids,
    prices,
    permalinks,
    available_quantity,
    sold_quantity,
    status,
    sub_status,
    date_created,
    last_updated,
    GTINS,
    SKUS,
    free_shipping,
    shipping_tags,
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
    status: result.data.map((lixo) => lixo.body.status),
    sub_status: result.data.map((lixo) => lixo.body.sub_status),
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
    free_shipping: result.data.map((lixo) => lixo.body.shipping.free_shipping),
    shipping_tags: result.data.map((lixo) => lixo.body.shipping.tags),
  };
  return {
    ids,
    titulos,
    catalog_product_ids,
    prices,
    permalinks,
    available_quantity,
    sold_quantity,
    status,
    sub_status,
    date_created,
    last_updated,
    GTINS,
    SKUS,
    free_shipping,
    shipping_tags,
  };
}

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
      console.log(error, "ConsultaUser: Error FINAL");
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
      console.log(error, "ConsultaSeller: Error FINAL");
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
    console.log(`SUCESS query ${nome}: ${duration / 1000}s`);
    return resposta;
  } catch (error) {
    const end = Date.now();
    const duration = end - start;
    console.log(`ERROR query ${nome}: ${duration / 1000}s`);
    return error;
  }
}

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
        headers: `Authorization: Bearer ${MELI_TOKEN}`,
      });
      // if (i == 10) {
      //   throw 'erro';
      // }
      console.log(
        `Frete: Loop ${i}: ${
          resposta_x.data.coverage.all_country.list_cost
        } ${JSON.stringify(resposta_x.data)}`
      );
      array_jsons_frete_apelado.push({
        id: array_ids[i],
        custo_frete_gratis: ~~(
          100 * resposta_x.data.coverage.all_country.list_cost
        ),
        billable_weight: ~~resposta_x.data.coverage.all_country.billable_weight,
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

async function pedidos_json(n) {
  console.log("começa pedidos_json");
  const url = `https://api.mercadolibre.com/orders/search?seller=${SELLER_ID}`;
  try {
    const result = await axios.get(url, {
      params: {
        offset: n * 50,
        limit: "50",
        sort: "date_desc",
        attributes:
          "results.id,results.paid_amount,results.total_amount,results.shipping,results.shipping_cost,results.pack_id,results.date_created,results.date_last_updated," +
          "results.buyer,results.tags," +
          "results.payments.order_id,results.payments.payer_id,results.payments.payment_type,results.payments.installments,results.payments.date_approved,results.payments.shipping_cost," +
          "results.order_items.sale_fee,results.order_items.item.id,results.order_items.item.title,results.order_items.item.seller_sku,results.order_items.quantity",
      },
      headers: `Authorization: Bearer ${MELI_TOKEN}`,
      // headers: `Authorization: Bearer ${fake_meli_token}`,
    });
    const {
      id,
      paid_amount,
      total_amount,
      shipping_id,
      shipping_cost,
      pack_id,
      date_created,
      date_last_updated,
      buyer_nickname,
      buyer_id,
      tags,
      //payments e order_items são listas, então tem q fazer um nested mapping
      payments_order_id,
      payments_payer_id,
      payments_payment_type,
      payments_installments,
      payments_date_approved,
      payments_shipping_cost,
      order_items_sale_fee,
      order_items_item_id,
      order_items_item_title,
      order_items_item_seller_sku,
      order_items_quantity,
    } = {
      id: result.data.results.map((lixo) => lixo.id),
      paid_amount: result.data.results.map(
        (lixo) => ~~(100 * lixo.paid_amount)
      ),
      total_amount: result.data.results.map(
        (lixo) => ~~(100 * lixo.total_amount)
      ),
      shipping_id: result.data.results.map((lixo) => lixo.shipping.id),
      shipping_cost: result.data.results.map((lixo) => lixo.shipping_cost),
      pack_id: result.data.results.map((lixo) => lixo.pack_id),
      date_created: result.data.results.map((lixo) => lixo.date_created),
      date_last_updated: result.data.results.map(
        (lixo) => lixo.date_last_updated
      ),
      buyer_nickname: result.data.results.map((lixo) => lixo.buyer.nickname),
      buyer_id: result.data.results.map((lixo) => lixo.buyer.id),
      tags: result.data.results.map((lixo) => lixo.tags),
      payments_order_id: result.data.results.map((lixo) => {
        return lixo.payments.map((x) => x.order_id);
      }),
      payments_payer_id: result.data.results.map((lixo) => {
        return lixo.payments.map((x) => x.payer_id);
      }),
      payments_payment_type: result.data.results.map((lixo) => {
        return lixo.payments.map((x) => x.payment_type);
      }),
      payments_installments: result.data.results.map((lixo) => {
        return lixo.payments.map((x) => x.installments);
      }),
      payments_date_approved: result.data.results.map((lixo) => {
        return lixo.payments.map((x) => x.date_approved);
      }),
      payments_shipping_cost: result.data.results.map((lixo) => {
        return lixo.payments.map((x) => ~~(100 * x.shipping_cost));
      }),
      order_items_sale_fee: result.data.results.map((lixo) => {
        return lixo.order_items.map((x) => ~~(100 * x.sale_fee));
      }),
      order_items_item_id: result.data.results.map((lixo) => {
        return lixo.order_items.map((x) => x.item.id);
      }),
      order_items_item_title: result.data.results.map((lixo) => {
        return lixo.order_items.map((x) => x.item.title);
      }),
      order_items_item_seller_sku: result.data.results.map((lixo) => {
        return lixo.order_items.map((x) => x.item.seller_sku);
      }),
      order_items_quantity: result.data.results.map((lixo) => {
        return lixo.order_items.map((x) => x.quantity);
      }),
    };

    //transformando os n arrays em 1 array de jsons
    const array_jsons = id.map((id, x) => ({
      id,
      paid_amount: paid_amount[x],
      total_amount: total_amount[x],
      shipping_id: shipping_id[x],
      shipping_cost: shipping_cost[x],
      pack_id: pack_id[x],
      date_created: date_created[x],
      date_last_updated: date_last_updated[x],
      buyer_nickname: buyer_nickname[x],
      buyer_id: buyer_id[x],
      tags: tags[x],
      payments_order_id: payments_order_id[x],
      payments_payer_id: payments_payer_id[x],
      payments_shipping_cost: payments_shipping_cost[x],
      payments_payment_type: payments_payment_type[x],
      payments_installments: payments_installments[x],
      payments_date_approved: payments_date_approved[x],
      order_items_sale_fee: order_items_sale_fee[x],
      order_items_item_id: order_items_item_id[x],
      order_items_item_title: order_items_item_title[x],
      order_items_item_seller_sku: order_items_item_seller_sku[x],
      order_items_quantity: order_items_quantity[x],
    }));
    console.log(array_jsons);
    return array_jsons;
  } catch (err) {
    console.log("PEDIDOS_JSON ERRO CNSIcnbIENDAIdQJW");
    throw err;
  }
}

app.get("/pedidosupserttable", async (req, res) => {
  console.log("começa pedidos");
  try {
    let array_jsons = [];
    const url = `https://api.mercadolibre.com/orders/search?seller=${SELLER_ID}`;
    const result = await axios.get(url, {
      params: {
        offset: 0,
        limit: "1",
        sort: "date_desc",
      },
      headers: `Authorization: Bearer ${MELI_TOKEN}`,
      // headers: `Authorization: Bearer ${fake_meli_token}`,
    });
    for (let i = 0; i < Math.ceil(result.data.paging.total / 50); i++) {
      console.log(`Pedidos: Loop ${i}`);
      const result_x = await pedidos_json(i);
      array_jsons.push(...result_x);
    }
    const string_das_colunas =
      "id,paid_amount,total_amount,shipping_id,shipping_cost,pack_id,date_created,date_last_updated,buyer_nickname,buyer_id,tags,payments_order_id,payments_payer_id,payments_shipping_cost,payments_payment_type,payments_installments,payments_date_approved,order_items_sale_fee,order_items_item_id,order_items_item_title,order_items_item_seller_sku,order_items_quantity";
    const excluded_string_de_colunas = string_das_colunas
      .split(",")
      .slice(1) //Tirando id pq ele n é SETADO no CONFLICT
      .map((x) => {
        return `${x} = EXCLUDED.${x}`;
      })
      .join(",");
    const texto_minha_query =
      `INSERT INTO public.pedidos (${string_das_colunas}) ` +
      `SELECT ${string_das_colunas} ` +
      "FROM json_populate_recordset (null::pedidos, $1) " +
      "ON CONFLICT (id) " +
      "DO UPDATE SET " +
      `${excluded_string_de_colunas}, ` +
      "data_atualizacao=CURRENT_TIMESTAMP(0)-interval '3 hour'";
    // console.log(texto_minha_query);
    const inserir = await minha_query({
      texto: texto_minha_query,
      params: [JSON.stringify(array_jsons)],
      nome: "upsert",
    });
    console.log(`Pedidos: Upserção da Table Pedidos ${inserir}`);
    res.render("home", {
      url_api: `https://api.mercadolibre.com/orders/search?seller=${SELLER_ID}&limit=1&sort=date_desc&include_attributes=all`,
      resultado_api: `Table Pedidos atualizada com sucesso. ${inserir.rowCount} linhas foram atualizadas.`,
      code: MELI_CODE,
      token: MELI_TOKEN,
    });
  } catch (err) {
    console.log(err, "Pedidos: Err FINAL");
    res.render("home", {
      url_api: `https://api.mercadolibre.com/items?ids=`,
      resultado_api: err,
      code: "",
      token: "",
    });
  }
});

app.get("/atualizartablefretes", async (req, res) => {
  var scroll_id_x = [""];
  var product_ids = [];
  const url1 = `https://api.mercadolibre.com/users/${SELLER_ID}/items/search`;
  array_jsons_frete_apelado = []; //atribuindo o valor como vazio pra "reiniciar" a variável qdo o usuário rodar mais de 1x na mesma sessão
  try {
    const result = await axios.get(url1, {
      headers: `Authorization: Bearer ${MELI_TOKEN}`,
    });
    for (let i = 0; i < Math.ceil(result.data.paging.total / 100); i++) {
      console.log(`Anúncios: Loop ${i}`);
      const result_x = await axios.get(url1, {
        params: {
          search_type: "scan",
          limit: "100",
          scroll_id: scroll_id_x[i], //na prática é como se puxasse de i-1 pq scroll_id_x[0] ja eh iniciado com o valor "" antes da primeira iteracao
        },
        headers: `Authorization: Bearer ${MELI_TOKEN}`,
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
    console.log(`Frete: Inserção dos IDs novos ${inserir}`);

    //Selecionando os IDs menor data_atualizacao
    const menos_atualizados = await minha_query({
      texto: `SELECT id FROM public.fretes ORDER BY data_atualizacao ASC, id DESC`,
      nome: "Frete: ids menor data_atualizacao",
    });
    // console.log(menos_atualizados.rows);
    const lista_menos_atualizados = menos_atualizados.rows.map(({ id }) => id);
    await puxar_fretes(lista_menos_atualizados); //os resultados são salvos na variável global ${array_jsons_frete_apelado} pq n sei se dá pra retornar error E o return da API
    res.send(
      "Frete: App fez mais de 1000 requisições na API sem dar erro 429???? Impossibru"
    );
  } catch (err) {
    console.log("Frete: qdo erra vem pra cá");
    console.log(
      `Frete: array_jsons_frete_apelado ${array_jsons_frete_apelado}`
    );
    if (err.response.data.status == 429) {
      console.log("erro 429: excesso de requisições");
      try {
        const inserir = await minha_query({
          texto:
            `INSERT INTO public.fretes (id,custo_frete_gratis, billable_weight)` +
            "SELECT id,custo_frete_gratis,billable_weight FROM json_populate_recordset(null::fretes, $1)" +
            "ON CONFLICT(id) DO UPDATE SET custo_frete_gratis = EXCLUDED.custo_frete_gratis, billable_weight = EXCLUDED.billable_weight, data_atualizacao=CURRENT_TIMESTAMP(0)-interval '3 hour'",
          params: [JSON.stringify(array_jsons_frete_apelado)],
          nome: "Frete: inserir",
        });
        console.log(`Frete: Inserção parcial dos fretes_apelados ${inserir}`);
        const ultima_data_atualizacao = await minha_query({
          texto:
            "SELECT id, data_atualizacao FROM public.fretes WHERE data_atualizacao IN" +
            "(SELECT data_atualizacao FROM public.fretes GROUP BY data_atualizacao ORDER BY data_atualizacao ASC LIMIT 1)",
          nome: "Frete: Puxar ultima data_atualizacao",
        });
        console.log(ultima_data_atualizacao.rows[0].data_atualizacao);
        const data_ptbr = `${ultima_data_atualizacao.rows[0].data_atualizacao.getFullYear()}-${ultima_data_atualizacao.rows[0].data_atualizacao.getMonth()}-${ultima_data_atualizacao.rows[0].data_atualizacao.getDate()} ${ultima_data_atualizacao.rows[0].data_atualizacao.getHours()}:${ultima_data_atualizacao.rows[0].data_atualizacao.getMinutes()}:${ultima_data_atualizacao.rows[0].data_atualizacao.getSeconds()}`;
        res.render("home", {
          url_api: `https://api.mercadolibre.com/users/${SELLER_ID}/shipping_options/free?item_id=`,
          resultado_api_um: `A API de Fretes do Mercado Livre só permite atualizar por volta de 500 IDs por vez.`,
          resultado_api_dois: "Table fretes parcialmente atualizada.",
          resultado_api_tres: `${ultima_data_atualizacao.rowCount} ids têm data de atualização mais antiga: ${data_ptbr}.`,
          resultado_api_quatro: `Clicar novamente no botão para atualizar novamente a table.`,
          code: MELI_CODE,
          token: MELI_TOKEN,
        });
      } catch (error2) {
        console.log(error2, "Frete: Error2 FINAL");
        res.render("home", {
          url_api: `https://api.mercadolibre.com/items?ids=`,
          resultado_api: error2,
          code: "",
          token: "",
        });
      }
    } else {
      console.log(err, "Frete: Erro FINAL");
      res.render("home", {
        url_api: `https://api.mercadolibre.com/items?ids=`,
        resultado_api: err,
        code: "",
        token: "",
      });
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
      headers: `Authorization: Bearer ${MELI_TOKEN}`,
    });
    for (let i = 0; i < Math.ceil(result.data.paging.total / 100); i++) {
      console.log(`Anúncios: Loop ${i}`);
      const result_x = await axios.get(url, {
        params: {
          search_type: "scan",
          limit: "100",
          scroll_id: scroll_id_x[i], //na prática é como se puxasse de i-1 pq scroll_id_x[0] ja eh iniciado com o valor "" antes da primeira iteracao
        },
        headers: `Authorization: Bearer ${MELI_TOKEN}`,
      });
      scroll_id_x.push(result_x.data.scroll_id);
      product_ids.push(...result_x.data.results); //https://stackoverflow.com/questions/1374126/how-to-extend-an-existing-javascript-array-with-another-array-without-creating
    }
    product_ids_reversed = product_ids.sort().toReversed();

    for (let i = 0; i < Math.ceil(product_ids_reversed.length / 20); i++) {
      // loop de 20 em 20 de 0 ate 1167
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
        status: lixo.status[x],
        sub_status: lixo.sub_status[x],
        date_created: lixo.date_created[x],
        last_updated: lixo.last_updated[x],
        gtin: lixo.GTINS[x],
        sku: lixo.SKUS[x],
        free_shipping: lixo.free_shipping[x],
        shipping_tags: lixo.shipping_tags[x],
      }));
      lixo_lista_jsons_agregado.push(...lixo_lista_jsons);
    }
    console.log(
      "lixo_lista_jsons_agregado************************************************************************************************",
      lixo_lista_jsons_agregado,
      "lixo_lista_jsons_agregado_final******************************************************************************************"
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
              id VARCHAR(100) primary key,
              titulo VARCHAR(200),
              catalog_product_id VARCHAR(100),
              price INT,
              permalink VARCHAR(200),
              available_quantity INT,
              sold_quantity INT,
              status VARCHAR(50),
              sub_status VARCHAR(50)[],
              date_created TIMESTAMPTZ,
              last_updated TIMESTAMPTZ,
              gtin VARCHAR(100),
              sku VARCHAR(100),
              free_shipping VARCHAR(100),
              shipping_tags VARCHAR(100) [],
              data_atualizacao TIMESTAMP(0) DEFAULT (CURRENT_TIMESTAMP(0)-interval '3 hour')
              )`,
      nome: "create",
    });
    console.log(`Create ${create}`);
    const string_das_colunas =
      "id,titulo,catalog_product_id,price,permalink,available_quantity,sold_quantity,status,sub_status,date_created,last_updated,gtin,sku,free_shipping,shipping_tags";
    // Insere
    const inserir = await minha_query({
      texto:
        `INSERT INTO public.anuncios (${string_das_colunas}) ` +
        `SELECT ${string_das_colunas} ` +
        "FROM json_populate_recordset(null::anuncios, $1)",
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
      url_api: `https://api.mercadolibre.com/items?ids=`,
      resultado_api: `Anúncios atualizados com sucesso em ${tempo}.`,
      code: MELI_CODE,
      token: MELI_TOKEN,
    });
  } catch (error) {
    console.log(error, "Anúncios: Erro FINAL");
    res.render("home", {
      url_api: `https://api.mercadolibre.com/items?ids=`,
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
      console.log(error, "Passport: Error");
    }
  })
);

passport.serializeUser((user, callback) => {
  callback(null, user);
});

passport.deserializeUser((user, callback) => {
  callback(null, user);
});

// async function teste_query(array_ids) {
//   resposta = await minha_query({
//     texto: "SELECT id FROM public.anuncios WHERE id = ANY($1)",
//     params: [array_ids],
//     nome: "testa query",
//   });
//   console.log(resposta);
//   return resposta;
// }
// teste_query(["MLB4945040624", "MLB4922063120"]);

module.exports = app;
