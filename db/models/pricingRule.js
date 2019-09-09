const constants = require("../../utils/constants.js");
const commonUtils = require("../../utils/commons.js");
const env = process.env.NODE_ENV || "development";
const config = require("../../db/config/config.js")[env];

const whiteListRules = {
  blackList: [],
  default: constants.WHITELISTALL
};

module.exports = function(sequelize, DataTypes) {
  var PricingRule = sequelize.define("PricingRule", {
    id: {
      type: DataTypes.STRING,
      allowNull: false,
      primaryKey: true,
      defaultValue: commonUtils.getDbID      
    },
    dealDescription: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    discountDescription: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    companyName: {
      type: DataTypes.STRING,
      allowNull: true
    },
    pizzaPrices: {
      type: DataTypes.JSON,
      allowNull: false
    },
    pricingRule: {
      type: DataTypes.JSON,
      allowNull: true
    }
  }, {
    schema: config.schema,
    classMethods: {
      getWhitelistedValues: function(pricingRule) {
        return commonUtils.getWhitelistedOp(pricingRule,whiteListRules);
      }
    }
  });
  return PricingRule;
}
