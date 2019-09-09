const models = require("../db/models");
const env = process.env.NODE_ENV || "development";
const config = require("../config/config.js")[env];
const logger = require("../services/logger");
const ObEither = require("../lib/ObservableEither");
const Either = require("../lib/Either");
const R = require("ramda");
const uuid = require("uuid");

module.exports = function(req, res, next) {
  req.state = { reqParams: req.params, reqBody: req.body, reqQuery: req.query, reqHeaders: req.headers,
  	originalUrl:req.originalUrl,reqMethod:req.method};
  req.state.requestId = uuid.v4();
  res.setHeader("X-RequestId",req.state.requestId);
  next();
};
