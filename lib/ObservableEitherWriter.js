//Use ObservableEither + Writer = Writer.WriterT(ObservableEither) // Unwrap to find if left or right and then log // Not going with this
//Use ObservableLogger + Either = Either.EitherT(ObservableLogger) // You get the logged observable. You just have to wrap it in a left or right // Seems more easy to do
"use strict"
require("./WriterT.js")
var ObservableEither = require("./ObservableEither.js").ObservableEither
var ObservableLogger = require("./ObservableLogger.js")
var SQLLogBundle = require("./log_types.js").SQLLogBundle;

var ObservableEitherLogger = (M) => Either.EitherT(ObservableLogger(M))
ObservableEitherLogger.prototype.flatMap = ObservableEitherLogger.prototype.chain;

Observable.prototype.liftOEL = function(logBundle, errorDescription){
  const argsForFromQuery = R.range(2, arguments.length).map(i => i.toString()).map(s => arguments[s])
  const ol = this.liftOL(logBundle, ...argsForFromQuery)
  return ObservableEitherLogger.of(ol.map(e => Either.fromNullable(e, errorDescription)))
}

Promise.prototype.liftOEL = function(logBundle, errorDescription){
  const argsForFromQuery = R.range(2, arguments.length).map(i => i.toString()).map(s => arguments[s])
  const ol = Observable.fromPromise(this).liftOL(logBundle, errorDescription, ...argsForFromQuery)
  return ObservableEitherLogger.of(ol)
  // TODO : Stream individual elements
  //(ol.flatMap(v => {
    //if (v instanceof Array) {
      //const OL = ObservableLogger(logBundle.Monoid)
      //Observable.from(v).map(i => OL.of(i))
    //} else {
      //Observable.just(Either.fromNullable(v, errorDescription))
    //}
  //}))
}
Sequelize.Promise.prototype.liftOEL = Promise.prototype.liftOEL

Either.prototype.liftOEL = function(logBundle){
  const OL = ObservableLogger(logBundle.Monoid)
  return ObservableEitherLogger.of(OL.of(this))
}

Sequelize.Model.prototype.tryAndLog = function(){
  let bundle = SQLLogBundle(Sequelize.logM);
  var args = (arguments.length === 1 ? [arguments[0]] : Array.apply(null, arguments));
  let method = R.take(1, args);
  let methodArgsAndError = R.drop(1, args);
  let methodArgs = R.dropLast(1, methodArgsAndError);
  let error = R.takeLast(1, methodArgsAndError)[0];
  let tableName = this.getTableName();
  try {
    return this[method].call(this, ...methodArgs).liftOEL(SQLLogBundle, tableName, method, methodArgs)
  } catch (e) {
    return Left(e).liftOEL(bundle)
  }
}
