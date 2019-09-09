const constants = require("../../utils/constants.js");
const commonUtils = require("../../utils/commons.js");
const env = process.env.NODE_ENV || "development";
const config = require("../../db/config/config.js")[env];

const whiteListRules = {
  blackList: [],
  default: constants.WHITELISTALL
};

module.exports = function(sequelize, DataTypes) {
  var Order = sequelize.define("Order", {
    id: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: commonUtils.getDbID,
      primaryKey: true
    },
    items: {
      type: DataTypes.JSON,
      allowNull: false
    },
    orderInfo: {
      type: DataTypes.JSON,
      allowNull: false
    },
    prId : {
      type: DataTypes.STRING,
      allowNull: false
    },
    prPricingRule: {
      type: DataTypes.JSON,
      allowNull: true
    },
    discountApplied: {
      type: DataTypes.BOOLEAN,
      allowNull: false
    },
    dealApplied :{
      type: DataTypes.BOOLEAN,
      allowNull: false
    },
    totalAmount: {
      type: "DECIMAL(10,2)",
      allowNull: false
    },
    discountAmount: {
      type: "DECIMAL(10,2)",
      allowNull: true
    },
    currency: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "AUD"
    }
  }, {
    schema: config.schema,
    classMethods: {
      getWhitelistedValues: function(order) {
        return commonUtils.getWhitelistedOp(order,whiteListRules);
      }
    }
  });
  return Order;
}
