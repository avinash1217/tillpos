const express = require("express");
const http = require('http');
const https = require('https');
// const app = express();
const router = express.Router();
const bodyParser = require("body-parser");
const port = process.env.PORT || 8015;
const env = process.env.NODE_ENV || "development";
const morgan = require("morgan");
const expressValidator = require("express-validator");
const config = require("./config/config.js")[env];
const useragent = require("express-useragent");
const logger = require("./services/logger.js");
const fs = require("fs");
const models = require('./db/models');
const request = require('request-promise');
const requestTracker = require("./middlewares/requestTracker");
const sessionTracker = require("./middlewares/sessionTracker");
const gracefulExit = require('express-graceful-exit');
const parser = require("xml2json");
const xmlparser = require('express-xml-bodyparser');
const cluster = require("cluster");
const pizzaCartRouter = require("./routes/pizzaCart.js");

initMiddlewares = (app) => {
  app.use(function(req, res, next) {
    if ('OPTIONS' == req.method) {
      return res.send(204);
    }
    next();
  });
  if ("development" === env) {
    app.use(morgan("dev"));
  }
  app.use(bodyParser.urlencoded({
    extended: false
  }));
  app.use(bodyParser.json({
    limit: "5mb",
    verify : function(req, res, buf, encoding) {
      if(req.headers && req.headers['x-signature'] && req.headers['x-signature'].indexOf('v2|') == 0) {
        req.rawBody = {
          buf: buf,
          encoding: encoding
        }
      }
    }
  }));
  app.use (function (error, req, res, next){
    if(error && error.status == 400){
      res.status(500).send({error:true, message: "BadRequest"})
    }else{
        next();
    }
  });
  // app.use(xmlParseMiddleware.parse);
  app.use(expressValidator());
  app.use(useragent.express());
  app.use(requestTracker);
  app.use(sessionTracker);
};

initRoutes = (app) => {
  app.get("/", (req, res) => {
    return res.send("UP");
  });

  app.use("/api/v1/pizzaCart", pizzaCartRouter);

};

startServer = () => {
  models.sequelize.sync().then(function() {
    server.listen(port, function() {
      logger.info("NUUP server listening on port " + port + " in " + env + " mode");
    })
  });
};

gracefullShutdown = (app) => {
  app.use(gracefulExit.middleware(app));
  process.on('SIGINT', () => {
    logger.info("Server Recieved Stop Signal.. :( ")
    gracefulExit.gracefulExitHandler(app, server, {
      socketio: app.settings.socketio,
      suicideTimeout: 300 * 1000,
      logger: logger.info,
      log: true
    })
  });

  process.on('SIGTERM', () => {
    logger.info("Server Recieved Stop Signal.. :( ")
    gracefulExit.gracefulExitHandler(app, server, {
      socketio: app.settings.socketio,
      suicideTimeout: 300 * 1000,
      logger: logger.info,
      log: true
    })
  });
}

startCluster = () => {
  if(cluster.isMaster) {
    let cpuCount = require('os').cpus().length;
    for (let i = 0; i < cpuCount; i += 1) {
      logger.info("Forking worker ", i);
      cluster.fork();
    }
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
  } else {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
    var app = express();
    initMiddlewares(app);
    initRoutes(app);
    var httpServer = http.createServer(app);


    httpServer.listen(port); //8015
    logger.info("NUUP server listening on port " + port + " in " + env + " mode version is "+require("./package.json").version);
  }
};

startCluster();
