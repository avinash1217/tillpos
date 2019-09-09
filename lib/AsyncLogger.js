var Observable = require("rx").Observable;
var Subject = require("rx").Subject;
const {tagged, taggedSum} = require('daggy');
var Redis = require("ioredis");
var r = new Redis();

const RealtimeLog = tagged("subject");
RealtimeLog.empty = () => {
  var subj = Subject();
  subj.subscribe((m) => r.publish("log", JSON.stringify(m)));
  return RealtimeLog(subj);
}

RealtimeLog.prototype.concat = function(x){
  if (x instanceof RealtimeLog){
    x.subject.subscribeOnNext(function(y){this.subject.onNext(y)})
  } else {
    this.subject.onNext(x);
  }
  return this;
}

module.exports = RealtimeLog
