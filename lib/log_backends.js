var Observable = require("rx").Observable;
var Subject = require("rx").Subject;
const {tagged, taggedSum} = require('daggy');
var Redis = require("ioredis");
var r = new Redis();
var LogMessage = require("./session_logging.js").LogMessage;
const { Tuple2 } = require('fantasy-tuples');

const RealtimeLog = (onMessage) => {
  const RealtimeLog = tagged("subject");
  RealtimeLog.empty = () => {
    const s = new Subject();
    s.subscribe(onMessage);
    return RealtimeLog(s);
  }
  RealtimeLog.of = (x) => {
    const s = new Subject();
    s.subscribe(onMessage);
    s.onNext(x);
    return RealtimeLog(s);
  };
  RealtimeLog.prototype.concat = function(e){
    if (e){
      if (e instanceof RealtimeLog){
        e.subject.subscribe(x => {this.subject.onNext(x)});
      } else {
        this.subject.onNext(e);
      }
      return RealtimeLog(this.subject);
    }
  };
  return RealtimeLog;
}

const RedisRealtimeLog = RealtimeLog(m => {
  if (m instanceof LogMessage.Sessioned){
    r.publish(m.sessionId, JSON.stringify(m.entry));
  } else if (m instanceof LogMessage.SessionLess){
    r.publish("sessionless_log", JSON.stringify(m.entry));
  } else {
    r.publish("sessionless_log", JSON.stringify(m));
  }
})

const ConsoleLog = RealtimeLog(m => {
  if (m instanceof LogMessage.Sessioned){
    console.log(m.sessionId + " -- " + JSON.stringify(m.entry));
  } else if (m instanceof LogMessage.SessionLess){
    console.log("no session -- " + JSON.stringify(m.entry));
  } else {
    console.log("no session --" + JSON.stringify(m));
  }
})

const PairMonoid = (M1, M2) => {
  const PairMonoid = tagged("m1", "m2");
  PairMonoid.empty = () => PairMonoid(M1.empty(), M2.empty());
  PairMonoid.of = x => PairMonoid(M1.of(x), M2.of(x));
  PairMonoid.prototype.concat = function(x){
    if (x instanceof PairMonoid){
      return PairMonoid(this.m1.concat(x.m1), this.m2.concat(x.m2))
    } else {
      return PairMonoid(this.m1.concat(x), this.m2.concat(x));
    }
  }
  return PairMonoid;
}

const ComposeMonoids = function(){
  var args = (arguments.length === 1?[arguments[0]]:Array.apply(null, arguments));
  if (args.length === 1){
    return args[0]
  } else {
    return args.slice(2).reduce(PairMonoid, PairMonoid(args[0], args[1]))
  }
}

Array.empty = () => Array.of()

const logBackends = {
  ConsoleLog,
  RedisRealtimeLog,
  PairMonoid,
  consoleAndRedisLog: PairMonoid(ConsoleLog, RedisRealtimeLog),
  ComposeMonoids: ComposeMonoids,
  array: Array
};

module.exports = logBackends;
