const path = require("path");
const config = {
  "development": {
    "pizzaPrices" : {
      "small" : "269.99",
      "medium" : "322.99",
      "large" : "394.99"
    },
    "currency" : "AUD"
  },
  "uat" : {
    "pizzaPrices" : {
      "small" : "269.99",
      "medium" : "322.99",
      "large" : "394.99"
    },
    "currency" : "AUD"
  },
  "prod" : {
    "pizzaPrices" : {
      "small" : "269.99",
      "medium" : "322.99",
      "large" : "394.99"
    },
    "currency" : "AUD"
  }
}

module.exports = config;
