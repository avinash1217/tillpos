const {tagged, taggedSum} = require('daggy');
var env       = process.env.NODE_ENV || 'development';
var config    = require('../config/config.json')[env];

const LogTypes = taggedSum({
  SQLQuery: ["model", "method", "query"],
  SQLResult: ["result"],
  SQLComplete: ["SQLQuery", "SQLResult"],
  RESTReq: ["url", "method", "query", "body"],
  RESTResp: ["status", "body"],
  RESTComplete: ["RESTReq", "RESTResp"],
  TOY: ["req", "resp"]
})

const SQLLogBundle = (M) => ({
  Monoid: M,
  fromQuery: LogTypes.SQLQuery,
  fromResult: LogTypes.SQLResult,
  finalLogFromQueryAndResult: LogTypes.SQLComplete
})

const ToyBundle = (M) => ({
  Monoid: M,
  fromQuery: s => s,
  fromResult: y => "Got a " + y,
  finalLogFromQueryAndResult: LogTypes.TOY
})

module.exports = {LogTypes, SQLLogBundle, ToyBundle};
