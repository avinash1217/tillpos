"use strict";
var R = require("ramda");
var Observable = require("rx").Observable;
var Writer = require("fantasy-writers");
require("./WriterT.js");
const { Tuple2 } = require('fantasy-tuples');
var LogTypes = require("./log_types.js").LogTypes;
var SQLLogBundle = require("./log_types.js").SQLLogBundle;
var db = require("../models/index.js");
var Sequelize = db.Sequelize;

Observable.of = Observable.just;
Observable.prototype.chain = Observable.prototype.flatMap;

const ObservableLogger = (Monoid) => {
  const ObservableLogger = Writer.WriterT(Observable, Monoid);
  ObservableLogger.prototype.flatMap = ObservableLogger.prototype.chain;
  ObservableLogger.fromValueAndLog = (x, y) => ObservableLogger(() => Tuple2(x, Monoid.of(y)))
  ObservableLogger.prototype.justConcat = function(y){
    const tuple = this.run();
    return ObservableLogger(() => Observable[of](Writer(Monoid)(() => Tuple2(tuple._1, tuple._2.concat(y)))))
  }
  return ObservableLogger;
}

Observable.prototype.liftOL = function(logBundle){
  const argsForFromQuery = R.range(1, arguments.length).map(i => i.toString()).map(s => arguments[s])
  const pre = logBundle.fromQuery(argsForFromQuery);
  return ObservableLogger(logBundle.Monoid)(() => this.map(v => {
    const logFromValue = logBundle.fromResult(v);
    const finalLogFromPreAndPost = logBundle.finalLogFromQueryAndResult(pre, logFromValue);
    return Writer(logBundle.Monoid)(() => Tuple2(v, logBundle.Monoid.of(finalLogFromPreAndPost)))
  }))
}

Promise.prototype.liftOL = function(logBundle){
  const argsForFromQuery = R.range(1, arguments.length).map(i => i.toString()).map(s => arguments[s])
  return Observable.fromPromise(this).liftOL(logBundle, ...argsForFromQuery)
}
Sequelize.Promise.prototype.liftOL = Promise.prototype.liftOL;

Sequelize.Model.prototype.logAnd = function(){
  let bundle = SQLLogBundle(Sequelize.logM);
  let method = R.take(1, arguments);
  let methodArgs = R.drop(1, arguments);
  let tableName = this.getTableName();
  return this[method].call(this, ...methodArgs).liftOL(SQLLogBundle, tableName, method, methodArgs)
}

module.exports = ObservableLogger
