const winston = require("winston");
const env = process.env.NODE_ENV || "development";
const config = require('../config/config.js')[env];
const application = process.env.NODE_APP || "app";
const APP_LOG = process.env.LOG_FILE ;
const ERROR_LOG = process.env.ERROR_LOG_FILE ;
const moment = require("moment-timezone");
const os = require("os");
const winstonConfig = require("../node_modules/winston/lib/winston/config");

const customLevels = {
  levels: {
    trace: 0,
    input: 1,
    verbose: 2,
    prompt: 3,
    debug: 4,
    info: 5,
    data: 6,
    help: 7,
    warn: 8,
    error: 9,
    sapir: 5,
    fapir: 5,
    npcir:5,
    bbpsr:5,
    regir:0
  },
  colors: {
    trace: 'magenta',
    input: 'grey',
    verbose: 'cyan',
    prompt: 'grey',
    debug: 'blue',
    info: 'green',
    data: 'grey',
    help: 'cyan',
    warn: 'yellow',
    error: 'red',
    sapir: "green",
    fapir: "red",
    npcir: "green",
    bbpsr: "green",
    regir: "red"
  }
};

winston.addColors(customLevels.colors);

const winstonLogger = new (winston.Logger)({
  levels: customLevels.levels,
  transports: [
    new(winston.transports.Console)({
      timestamp: function() {
        return moment().utcOffset("+05:30").format("DD-MM-YYYY HH:mm:ss:SSS")
      },
      formatter: function(options) {
        return options.timestamp() +" "+os.hostname()+" "+env+" "+options.level +" "+
          (undefined !== options.message ? options.message : "")+
          (options.meta && Object.keys(options.meta).length ? " \t"+ JSON.stringify(options.meta) : '' );
      },
      colorize: true
    }),
    new(winston.transports.File)({
      filename: APP_LOG || "./"+application + ".data.log",
      json: true,
      colorize: false
    }),
    new (winston.transports.File)({ 
      filename: ERROR_LOG ||"./"+application + ".error.data.log",
      name:'file.error',
      level:'regir',
      json: false,
      timestamp: function() {
        return moment().utcOffset("+05:30").format("DD-MM-YYYY HH:mm:ss:SSS")
      },
      formatter: function(options) {
        return options.timestamp() +" "+os.hostname()+" "+env+" "+options.level +" "+
          (undefined !== options.message ? options.message : "")+
          (options.meta && Object.keys(options.meta).length ? " \t"+ JSON.stringify(options.meta) : '' );
      }
    })
  ]
});

module.exports = winstonLogger;