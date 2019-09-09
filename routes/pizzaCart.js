const express = require("express")
const env = process.env.NODE_ENV || "development";
const config = require("../config/config.js")[env];
const models = require("../db/models");
const router = express.Router();
const logger = require("../services/logger");
const request = require("request-promise");
const Either = require("../lib/Either.js");
const R = require("ramda");
const async = require("asyncawait/async");
const await = require("asyncawait/await");
const helper = require("../utils/helper");
const uuid = require("uuid");
const constants = require("../utils/constants");
const xmlParser = require("xml2json");
const removeSpecialCharRegex = /[^a-zA-Z0-9 ]/g;
const sequelize = models.sequelize;

router.get("/pricingRules", (req, res) => {
  getPricingRules(req.state)
    .chain(state => getDistinctCompanies(state).liftOE())
    .bichain(postTxn, postTxn)
    .fold(l => l, r => r)
    .subscribe(val => {
      return res.status(200).send(val);
    }, err => {
      helper.log500Error(err, req);
      return res.status(500).send({ error: true, message: "Internal Server Error" });
    })
});

router.post("/order", (req, res) => {
  createOrder(req.state)
    .bichain(postTxn, postTxn)
    .fold(l => l, r => r)
    .subscribe(val => {
      return res.status(200).send(val);
    }, err => {
      helper.log500Error(err, req);
      return res.status(500).send({ error: true, message: "Internal Server Error" });
    })
});

router.post("/createRule", (req, res) => {
  createNewRule(req.state)
    .bichain(postTxn, postTxn)
    .fold(l => l, r => r)
    .subscribe(val => {
      return res.status(200).send(val);
    }, err => {
      helper.log500Error(err, req);
      return res.status(500).send({ error: true, message: "Internal Server Error" });
    })
});

router.post("/updateRule", (req, res) => {
  updateRule(req.state).liftOE()
    .bichain(postTxn, postTxn)
    .fold(l => l, r => r)
    .subscribe(val => {
      return res.status(200).send(val);
    }, err => {
      helper.log500Error(err, req);
      return res.status(500).send({ error: true, message: "Internal Server Error" });
    })
});

router.post("/deleteRule", (req, res) => {
  deleteRule(req.state)
    .chain(deleteRuleSuccessful)
    .bichain(postTxn, postTxn)
    .fold(l => l, r => r)
    .subscribe(val => {
      return res.status(200).send(val);
    }, err => {
      helper.log500Error(err, req);
      return res.status(500).send({ error: true, message: "Internal Server Error" });
    })
});

const getPricingRules = state => {
  if(state.reqQuery.company){
    return getPricingRuleByCompany(state);
  }
    return getPricingRule(state);
};

const getPricingRuleByCompany = helper.genericModelOutput("pricingRules", {
  error: true,
  message: "Error fetching pricing rules",
  userMessage: "Error fetching pricing rules"
},
state => helper.findAll("PricingRule",{companyName : state.reqQuery.company}).liftOE()
);

const getPricingRule = helper.genericModelOutput("pricingRules", {
    error: true,
    message: "Error fetching pricing rules",
    userMessage: "Error fetching pricing rules"
  },
  state => helper.findAll("PricingRule",{companyName :  {$eq : null}}).liftOE()
);

const getDistinctCompanies = async(state => {
  let companies = [];
  let query = `SELECT DISTINCT "companyName" FROM "PricingRules" WHERE "companyName" IS NOT NULL;`;
  let queryResult = await(models.sequelize.query(query));
  if (queryResult && queryResult[0]) {
    for(var i in queryResult[0]){
      companies.push(queryResult[0][i].companyName);
    }
  }
  return Either.Right(R.merge(state, {companies: companies}));
});

const createOrder = state => {
  return createPayload(state)
    .chain(createDbRecord)
    .bichain(
      state=>{
        return Either.Right(state).liftOE()}, 
      state => {
        return Either.Right(state).liftOE()})
}

const createPayload = (state) => {
  let payload = {};
  if(state.reqBody.order && R.is(Object, state.reqBody.order)){
    payload = createOrderPayload(state);
  }
  state.payload = payload;
  if(state.payload){
    return Either.Right(state).liftOE();
  }
  return Either.Left(R.merge(state, {  
    error: true,
    message: "Error creating order",
    userMessage: "Error creating order"})).liftOE();
};

const createOrderPayload = (state) => {
  let createPayload = {};
  let totalAmount ;
  let prId;
  let pzaPrice = {};
  let dealPrice = {} ;
  let discountPrice = {};
  let finalPzaPrice = 0;
  let finalDealPrice = 0;
  let finalDiscountPrice = 0;
  let pizzaPrice = {};
  let discount;
  let deal;
  let pizzas;


  if(state.reqBody.order && state.reqBody.order.pizzaPrices){
    if(state.reqBody.company){
      createPayload.company = state.reqBody.order.company;
    }
    pizzaPrices = state.reqBody.order.pizzaPrices;
  } 

  if(state.reqBody.order && state.reqBody.order.items){
    createPayload.items = state.reqBody.order.items;
    if(createPayload.items.pizzas){
     pizzas = createPayload.items.pizzas;

      // Deals and Discounts
      if(pizzas.pricingRule){ //Pricing rule with deals...
        prId = pizzas.pricingRule.id;
        if(pizzas.pricingRule.deal){ //count & name should be coming from Application for each type of pizza
          deal = pizzas.pricingRule.deal;
          if(deal.small){
            deal.small.count = deal.small.count ? parseInt(deal.small.count) : 0 ;
            deal.small.pay = deal.small.buy ?  parseInt(deal.small.buy) * deal.small.count : 0 ;
            deal.small.get = deal.small.get ? parseInt(deal.small.get) * deal.small.count : 0 ;
            dealPrice.small = pizzaPrices.small * deal.small.pay;
          }
          if(deal.medium){
            deal.medium.count = deal.medium.count ? parseInt(deal.medium.count) : 0 ;
            deal.medium.pay = deal.medium.buy ?  parseInt(deal.medium.buy) * deal.medium.count : 0 ;
            deal.medium.get = deal.medium.get ? parseInt(deal.medium.get) * deal.medium.count : 0 ;
            dealPrice.medium = pizzaPrices.medium * deal.medium.pay;
          }
          if(deal.large){
            deal.large.count = deal.large.count ? parseInt(deal.large.count) : 0 ;
            deal.large.pay = deal.large.buy ?  parseInt(deal.large.buy) * deal.large.count : 0 ;
            deal.large.get = deal.large.get ? parseInt(deal.large.get) * deal.large.count : 0 ;
            dealPrice.large = pizzaPrices.large * deal.large.pay;
          }
          dealPrice.small = dealPrice.small ? parseFloat(dealPrice.small) : 0;
          dealPrice.medium = dealPrice.medium ? parseFloat(dealPrice.medium) : 0;
          dealPrice.large = dealPrice.large ? parseFloat(dealPrice.large) : 0;
          finalDealPrice = parseFloat(dealPrice.small + dealPrice.medium + dealPrice.medium);
        }
        if(pizzas.pricingRule.discount){ 
          //Pricing rule with discounts
          //count & name should be coming from Application for each type of pizza
          discount = pizzas.pricingRule.discount;
          if(discount.small && pizzas.hasOwnProperty('small')){
            discount.small.count = pizzas.small.count ? parseInt(pizzas.small.count) : 0 ;
            discount.small.price = pizzaPrices.small - discount.small.price;
            discountPrice.small = discount.small.price * discount.small.count;
          }
          if(discount.medium && pizzas.hasOwnProperty('medium')){
            discount.medium.count = pizzas.medium.count ? parseInt(pizzas.medium.count) : 0 ;
            discount.medium.price = pizzaPrices.medium - discount.medium.price;
            discountPrice.medium = discount.medium.price * discount.medium.count;
          }
          if(discount.large && pizzas.hasOwnProperty('large')){
            discount.large.count = pizzas.large.count ? parseInt(pizzas.large.count) : 0 ;
            discount.large.price = pizzaPrices.large - discount.large.price;
            discountPrice.large = discount.large.price * discount.large.count;
          }
          discountPrice.small = discountPrice.small ? parseFloat(discountPrice.small) : 0;
          discountPrice.medium = discountPrice.medium ? parseFloat(discountPrice.medium) : 0;
          discountPrice.large = discountPrice.large ? parseFloat(discountPrice.large) : 0;
          finalDiscountPrice = parseFloat(discountPrice.small + discountPrice.medium + discountPrice.large);
        }
      }
      // Pizza orders
      if(pizzas.small){ //count & name should be coming from Application for each type of pizza
        pizzas.small.count = pizzas.small.count ? parseInt(pizzas.small.count) : 0 ;
        pizzaPrice.small = pizzaPrices.small * pizzas.small.count;
      }
      if(pizzas.medium){
        pizzas.medium.count = pizzas.medium.count ? parseInt(pizzas.medium.count) : 0 ;
        pizzaPrice.medium = pizzaPrices.medium * pizzas.medium.count;
      }
      if(pizzas.large){
        pizzas.large.count = pizzas.large.count ? parseInt(pizzas.large.count) : 0 ;
        pizzaPrice.large = pizzaPrices.large * pizzas.large.count;

      }
      pzaPrice.small = pizzaPrice.small ? parseFloat(pizzaPrice.small) : 0;
      pzaPrice.medium = pizzaPrice.medium ? parseFloat(pizzaPrice.medium) : 0;
      pzaPrice.large = pizzaPrice.large ? parseFloat(pizzaPrice.large) : 0;
      finalPzaPrice = parseFloat(pzaPrice.small + pzaPrice.medium + pzaPrice.large);
      totalAmount = (finalPzaPrice + finalDealPrice) - finalDiscountPrice;
    }
    createPayload.prId = prId;
    createPayload.orderInfo = state.reqBody.order;
    createPayload.prPricingRule = pizzas.pricingRule ? pizzas.pricingRule : '';
    createPayload.discountApplied = pizzas.pricingRule.discount ? 't' : 'f';
    createPayload.dealApplied = pizzas.pricingRule.deal ? 't' : 'f';
    createPayload.totalAmount = totalAmount;
    createPayload.discountAmount = finalDiscountPrice;
    createPayload.currency = config.currency;
  } 
  return createPayload;
};

const createDbRecord = helper.genericModelOutput("order",constants.JP3,
  state => helper.createRecord("Order", state.payload)
);

const createNewRule = state => {
  return createNewRulePayload(state)
  .chain(createNewRuleRecord)
  .bichain(
    state=>{
      return Either.Right(state).liftOE()}, 
    state => {
      return Either.Right(state).liftOE()})
}; 

const createNewRulePayload = (state) => {
  let payload = {};
  if(state.reqBody.rule && R.is(Object, state.reqBody.rule)){
    payload = createRulePayload(state);
  }
  state.payload = payload;
  if(state.payload){
    return Either.Right(state).liftOE();
  }
  return Either.Left(R.merge(state, {  
    error: true,
    message: "Error creating pricing Rule",
    userMessage: "Error creating pricing rule"})).liftOE();
};

const createNewRuleRecord = helper.genericModelOutput("pricingRule",{
  error: true,
  errorCode: "JP3",
  userMessage: "Error creating pricing Rule",
  message: "Error creating pricing Rule"
},
  state => helper.createRecord("PricingRule", state.payload)
);

const createRulePayload = state => {
  let keys = {};
  if(state.reqBody.rule){
    rule = state.reqBody.rule;
    keys.dealDescription = rule.dealDescription ? rule.dealDescription : null,
    keys.discountDescription = rule.discountDescription ? rule.discountDescription : null,
    keys.companyName = rule.companyName ? rule.companyName : null,
    keys.pizzaPrices = rule.pizzaPrices,
    keys.pricingRule = rule.pricingRule ?  rule.pricingRule : null
  }
  return keys;
};

const updateRule = async(state => {
  if(state.reqBody.rule && R.is(Object, state.reqBody.rule)){
    let updatedRule = await( updateOneRule(state.reqBody.rule) );
      if(!updatedRule) {
        state.rule = R.merge(state, {error: true});
      } else {
        state.rule = updatedRule;
      }
    }
  return state;
});

const updateOneRule = (rule) => {
  return helper.updateRecordP("PricingRule", getupdatedRuleKeys(rule), {
    id: rule.id
  });
};

const getupdatedRuleKeys = rule => {
  let keys = {};
  if(R.has("id")(rule)){
    keys.dealDescription = rule.dealDescription ? rule.dealDescription : null,
    keys.discountDescription = rule.discountDescription ? rule.discountDescription : null,
    keys.companyName = rule.companyName ? rule.companyName : null,
    keys.pizzaPrices = rule.pizzaPrices,
    keys.pricingRule = rule.pricingRule ?  rule.pricingRule : null
  }
  return keys;
};

const deleteRule = helper.genericModelOutput("pricingRule", {
    error: true,
    message: "Error deleting pricing rule",
    userMessage: "Error deleting pricing rule"
  },
  state => helper.deleteRecord("PricingRule", {
    where: {
      id : state.reqBody.pricingRule.id
    }
  })
);

const deleteRuleSuccessful = (state) => {
  if (state.pricingRule ) {
    delete state.pricingRule;
    return Either.Right(R.merge(state, {status: "SUCCESS"})).liftOE();
  }
  delete state.pricingRule;
  return Either.Left(R.merge(state, { error: true, message: "Error deleting pricing rule" , userMessage : "Error deleting pricing rule" })).liftOE();
}

const postTxn = (state, flag) => {
  return logTxnInfo(state, flag)
    .bimap(state => helper.getWhitelistedOp(state, {
      whiteList: ["pricingRules","pricingRule", "companies", "order", "rule",
      "status", "error", "message", "userMessage", "errorCode"],
      blackList: [],
      default: constants.BLACKLISTALL
    }), state => helper.getWhitelistedOp(state, {
      whiteList: ["pricingRules", "pricingRule", "companies", "order", "rule",
       "status", "error", "message", "userMessage", "errorCode"],
      blackList: [],
      default: constants.BLACKLISTALL
    }))
};

const logTxnInfo = (state, flag) => {
  try {
      logger.info(state.sessionId, state.requestId, state);
  } catch (e) {
    console.log("Error while logging ", state, e);
  }
  return flag ? Either.Right(state).liftOE() : Either.Left(state).liftOE();
};

module.exports = router;
