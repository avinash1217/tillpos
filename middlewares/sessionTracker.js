const models = require("../db/models");
const env = process.env.NODE_ENV || "development";
const config = require("../config/config.js")[env];
const logger = require("../services/logger");
const ObEither = require("../lib/ObservableEither");
const Either = require("../lib/Either");
const R = require("ramda");
const xmlParser = require("xml2json");

module.exports = function(req, res, next) {
  let dataToLog = '';
  dataToLog = req.state.reqBody;
  if (!req.state.reqHeaders["x-sessionid"]) {
    req.state.sessionId = req.state.requestId;
  } else {
    req.state.sessionId = req.state.reqHeaders["x-sessionid"];
  }
  try {
    if((req.originalUrl.includes('Req') || req.originalUrl.includes('Resp')) && dataToLog && dataToLog!= 'null'){
      logger.info(xmlParser.toXml(dataToLog));
      logger.info(req.originalUrl, req.state.sessionId,
        req.state.requestId, req.state.reqQuery, dataToLog);
      }
    }
    catch (error) {
      logger.info( req.originalUrl, req.state.sessionId,
        req.state.requestId, req.state.reqQuery, req.state.reqBody);
      }
      next();
  };
