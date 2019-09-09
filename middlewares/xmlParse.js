const models = require("../db/models");
const env = process.env.NODE_ENV || "development";
const config = require("../config/config.js")[env];
const logger = require("../services/logger");
const helper = require("../utils/helper.js");
const ObEither = require("../lib/ObservableEither");
const Either = require("../lib/Either");
const R = require("ramda");
const xmlParser = require("xml2json");

exports.parse = function(req, res, next) {
  if (req.is("application/xml")) {
    var bodyStr = '';
    req.on("data", function(chunk) {
      bodyStr += chunk.toString();
    });
    req.on("end", () => {
      /*let newBodyStr = filterBody(bodyStr);
      if(bodyStr.includes("RespMandate")){
        logger.info(JSON.stringify(newBodyStr))
      }else{
        logger.info(bodyStr);
      }*/
      req.body = xmlParser.toJson(bodyStr);
      next();
      if (req.body.indexOf("ns2:BillFetchResponse") >= 0) {
        let jsonObj = JSON.parse(req.body);
        if (jsonObj["ns2:BillFetchResponse"]["BillerResponse"] && jsonObj["ns2:BillFetchResponse"]["BillerResponse"]["customerName"]) {
          var str1 = bodyStr.substring(bodyStr.indexOf('<BillerResponse'))
          var str2 = str1.substring(str1.indexOf('customerName="'));
          var customerName = str2.substring('customerName="'.length, str2.indexOf('" '));
          jsonObj["ns2:BillFetchResponse"]["BillerResponse"]["customerName"] = customerName;
          req.body = JSON.stringify(jsonObj);
        }
      }

    /*  if( req.headers["x-npci-request"] && req.headers["x-npci-request"]=="TRUE") {
        next();
      } else if( req.headers["x-bbps-request"] && req.headers["x-bbps-request"]=="TRUE") {
          next();
      } else {
        logger.info("NOT an UPI Switch Request/Response",req.state);
        return res.status(401).send({error:true,message:"Invalid credentials"});
      }*/
    });
  } else {
    next();
  }
};

const filterBody = (bodyStr) =>{
  let bodyJson = xmlParser.toJson(bodyStr);
  if(bodyStr.includes("RespMandate")){
    bodyJson = JSON.parse(bodyJson);
    delete bodyJson["ns2:RespMandate"]["Signature"];
  }else{
    return bodyJson;
  }
}
