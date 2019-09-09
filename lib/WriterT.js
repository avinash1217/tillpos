"use strict";
var Writer = require("fantasy-writers");
const {tagged} = require('daggy');
const {empty, of, concat, map, chain} = require('fantasy-land');
const { Tuple2 } = require('fantasy-tuples');

Writer.WriterT = (Monad, Monoid) => {
  const WriterT = tagged("run");
  const W = Writer(Monoid);
  WriterT[of] = (x) => WriterT(() => Monad[of](W[of](x)));
  WriterT.prototype[map] = function(f){
    return this[chain]((a) => WriterT[of](f(a)));
  }
  WriterT.prototype[chain] = function(f){
    return WriterT(() => this.run()[chain]((outerWriter) => {
      const outerTuple = outerWriter.run();
      const newMonadWrappedWriter = f(outerTuple._1).run();
      return newMonadWrappedWriter[map]((writer) => {
        const innerTuple = writer.run();
        return W(() => Tuple2(innerTuple._1, outerTuple._2.concat(innerTuple._2)));
      })
    }))
  }
  return WriterT;
}
