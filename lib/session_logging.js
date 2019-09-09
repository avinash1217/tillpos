const {tagged, taggedSum} = require('daggy');

const LogMessage = taggedSum({
  Sessioned: ["sessionId", "entry"],
  SessionLess: ["entry"]
})

const SessionedLog = (sessionId, M) => {
  const SessionedLog = tagged("sessionId", "m");
  SessionedLog.empty = () => SessionedLog(sessionId, M.empty());
  SessionedLog.of = x => SessionedLog(sessionId, M.of(LogMessage.Sessioned(sessionId, x)));
  SessionedLog.prototype.concat = function(x){
    if (x instanceof SessionedLog || x instanceof SessionLessLog){
      return SessionedLog(this.sessionId, this.m.concat(x.m))
    } else {
      return SessionedLog(this.sessionId, this.m.concat(LogMessage.Sessioned(this.sessionId, x)));
    }
  }
  return SessionedLog;
}

const SessionLessLog = (M) => {
  const SessionLessLog = tagged("m");
  SessionLessLog.empty = () => SessionLessLog(M.empty());
  SessionLessLog.of = x => SessionLessLog(M.of(LogMessage.SessionLess(x)));
  SessionLessLog.prototype.concat = function(x){
    if (x instanceof SessionLessLog){
      return SessionLessLog(this.m.concat(x.m));
    } else {
      return SessionLessLog(this.m.concat(LogMessage.SessionLess(x)));
    }
  }
  return SessionLessLog;
}

module.exports = {SessionedLog, SessionLessLog, LogMessage};
