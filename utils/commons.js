const R = require("ramda");
const constants = require("./constants");
const env = process.env.NODE_ENV || "development";
const dbConfig = require("../db/config/config.js")[env];
const uuid = require("uuid");
const chance = require("chance").Chance();

const getWhitelistedOp = (state, keys) => {
  if (keys.default == constants.WHITELISTALL) {
    let newState = blackListKeys(state, keys.blackList);
    return whiteListKeys(state, keys.whiteList || [], newState);
  } else if (keys.default == constants.BLACKLISTALL) {
    let newState = whiteListKeys(state, keys.whiteList);
    return blackListKeys(newState, keys.blackList || []);
  }
};

const blackListKeys = (state, keys) => {
  let newState = R.clone(state);
  keys.map(key => {
    if (Array.isArray(key)) {
      newState = R.dissocPath(key, state);
    } else {
      delete newState[key];
    }
  });
  return newState;
};

const whiteListKeys = (state, keys, startState) => {
  let newState = startState || {};
  keys.map(key => {
    if (Array.isArray(key) && R.path(key, state) != undefined) {
      newState = R.assocPath(key, R.path(key, state), newState);
    } else {
      if (state[key] != undefined) {
        newState[key] = state[key];
      }
    }
  });
  return newState;
};

const getDbID = () => {  
  return dbConfig.prefix + uuid.v4().substr(1, 34).replace(/-/g,"");
};

exports.getWhitelistedOp = getWhitelistedOp;
exports.getDbID = getDbID;
