"use strict"
var R = require("ramda");
var Sequelize = require("sequelize");
var Either = require("../lib/Either.js");
var Left = Either.Left
var Right = Either.Right
var Observable = require("rx").Observable;
var EitherHelpers = require("fantasy-contrib-either")

Either.fromNullable = (v, e) => {
  if (v === null || v === undefined){
    return Left(e)
  } else {
    return Right(v)
  }
}

Either.fromCondition = (x, e, f) => (x === true || f(x)) ? Right(x) : Left(e)

Either.fromTryCatch = (f) => {
  try {
    return Right(f())
  } catch (e) {
    return Left(e)
  }
}

Either.fromTryCatch1 = (f, args) => {
  try {
    return Right(f(args))
  } catch (e) {
    return Left(e)
  }
}

Either.prototype.leftMap = f=>{
  return this.fold(l=>Either.left(f(l)),r=>Either.Right(r));
}

Observable.of = Observable.just;
Observable.prototype.chain = Observable.prototype.flatMap;

let ObservableEither = Either.EitherT(Observable);

ObservableEither.pure = function(x){
  return ObservableEither(x);
}

Either.prototype.liftOE = function(){
  return ObservableEither.pure(Observable.just(this));
}

Observable.prototype.liftOE = function(){
  return ObservableEither.pure(this.map((v) => {
    if (v instanceof Array){
      return Observable.from(v).map(v => Right(v))
    } else if (v instanceof Either){
      return v
    } else {
      return Right(v)
    }
  }));
}

Either.prototype.flatMap = Either.prototype.chain
ObservableEither.prototype.flatMap = ObservableEither.prototype.chain

Promise.prototype.liftOE = function(errorDescription){
  return ObservableEither.pure(Observable.fromPromise(this).flatMap((v) => {
    // if (v instanceof Array){
    //   return Observable.from(v).map((v) => Right(v))
    // } else
    if (v instanceof Right){
      return Observable.of(v)
    } else if (v instanceof Left){
      return Observable.of(errorDescription ? Left(errorDescription) : v)
    } else {
      return Observable.just(Either.fromNullable(v, errorDescription))
    }
  }).catch((e) => Observable.just(Left(e))))
}

Sequelize.Promise.prototype.liftOE = Promise.prototype.liftOE;
ObservableEither.prototype.reduce = function(f, seed){
  return ObservableEither.pure(this.run.reduce(f, seed))
}

ObservableEither.prototype.allRight = function(){
  return this.reduce((prev, e) => {
    let prevTrue = EitherHelpers.isRight(prev);
    let eTrue = EitherHelpers.isRight(e);
    if (prevTrue && eTrue){
      return Right(true)
    } else {
      return Left(false)
    }
  }, ObservableEither.of(true))
}

ObservableEither.prototype.filter = function(f){
  return this.flatMap((e) => {
    if (f(e)){
      return ObservableEither.of(e)
    } else {
      return Observable.empty().liftOE()
    }
  })
}

ObservableEither.prototype.leftMap = function(f){
  return this.fold(l=>Either.left(f(l)),r=>Either.Right(r)).liftOE();
}

ObservableEither.prototype.bimap = function(f,g){
  return this.fold(l=>Either.Left(f(l)),r=>Either.Right(g(r))).liftOE();
}

ObservableEither.prototype.zip = function(other, f){
  return this.flatMap((e1) => {
    return other.map((e2) => {
      return f(e1, e2)
    })
  })
}

Sequelize.Model.prototype.tryTo = function(){
  var args = (arguments.length === 1 ? [arguments[0]] : Array.apply(null, arguments));
  let method = R.take(1, args);
  let methodArgsAndError = R.drop(1, args);
  let methodArgs = R.dropLast(1, methodArgsAndError);
  let error = R.takeLast(1, methodArgsAndError)[0];
  try {
    return this[method].call(this, ...methodArgs).liftOE(error);
  } catch (e) {
    return Left(e).liftOE()
  }
}

module.exports = ObservableEither;
