const logger = require("../services/logger");
const models = require("../db/models");
const ObEither = require("../lib/ObservableEither");
const Either = require("../lib/Either.js");
const env = process.env.NODE_ENV || "development";
const config = require("../config/config.js")[env];
const R = require("ramda");
const async = require("asyncawait/async");
const await = require("asyncawait/await");
const jwt = require('jsonwebtoken');
const constants = require("./constants");
const shortid = require("shortid");
const uuid = require("uuid");
const xmlParser = require("xml2json");
const moment = require("moment-timezone");
const Query = models.Query;
const axios = require("axios");
const dbConfig = require("../db/config/config.js")[env];
const gcm = require('node-gcm');
const sender = new gcm.Sender(config.fcmAPIKey);
const apn = require("apn");
const normalizedVpaCharRegex = /[^a-zA-Z0-9@ ]/g;
const crypto = require("crypto");

const findOne = (entity, value) => {
  if(entity == "Transaction"){
    entity = "TransactionView"
  }
  return Either.fromCondition(entity, { message: "Invalid entity in findRecord", entity: entity },
      entity => isValidFindOneRequest(entity, value))
    .liftOE()
    .flatMap(entity => {
      return models[entity].tryTo("findOne", { where: value }, { message: "No record found " + entity })
    })
    .map(dbValue => dbValue.dataValues);
};


const genericModelOutput = (entity, error, fn) => {
  let errorData = {
    error: true,
    message: "Internal Server Error",
    userMessage: "Internal Server Error"
  };
  return state => fn(state).bimap(queryResult => {
      error["errorResult"] = queryResult;
      return R.merge(state, R.merge(errorData, error))
    },
    queryResult => {
      state[entity] = queryResult
      return state;
    })
};

const findOrCreateRecord = (entity, whereClause, defaultValue) => {
  return Either.fromCondition(entity, {
        message: "Invalid entity in findOrCreateRecord",
        entity: entity
      },
      entity => isValidEntity(entity))
    .liftOE()
    .flatMap(entity => findOrCreateRecordP(entity, whereClause, defaultValue).liftOE())
    .flatMap(result => Either.fromCondition(result, {
        message: "Error execution findOrCreateRecord",
        result: result
      },
      result => result).liftOE())
};

const findOneP = (entity, whereCriterion) => {
  if (!isValidFindOneRequest(entity, whereCriterion)) {
    logger.error("Invalid findOne request ", entity, whereCriterion);
    return null;
  }
  if(entity == "Transaction"){
    entity = "TransactionView"
  }
  var result = await (models[entity].findOne({
    where: whereCriterion
  }));
  if (result && result.dataValues) {
    return result.dataValues;
  } else {
    logger.warn("Error finding record ", entity, whereCriterion);
    return null;
  }
};

const findOrCreateRecordP = async((entity, whereClause, defaultValue) => {
  var result = await (models[entity].findOrCreate({
    where: whereClause,
    defaults: defaultValue
  }));
  if (!(result && Array.isArray(result) && result.length >= 2)) {
    logger.error("Couldn't findOrCreate", entity, whereClause, defaultValue);
    return null;
  }
  return result[0].dataValues;
});

const isValidWhereClause = (whereCriterion) => {
  if (!R.is(Object, whereCriterion)) {
    logger.warn("Invalid where clause in findOne ", whereCriterion);
    return false;
  }
  return true;
};

const isValidEntity = (entity) => {
  if (!entity || !models[entity]) {
    logger.warn("Invalid entity in findOne ", entity);
    return false;
  }
  return true;
};

const isValidFindOneRequest = (entity, whereCriterion) => {
  return R.allPass([
    (entity, whereCriterion) => isValidWhereClause(whereCriterion),
    (entity, whereCriterion) => isValidEntity(entity)
  ])(entity, whereCriterion);
};

const isValidFindAllRequest = (entity, whereCriterion) => {
  return R.allPass([
    (entity, whereCriterion) => isValidWhereClause(whereCriterion),
    (entity, whereCriterion) => isValidEntity(entity)
  ])(entity, whereCriterion);
};

const findAll = async((entity, whereCriterion, raw_values = false) => {
  if (!isValidFindAllRequest(entity, whereCriterion)) {
    return null;
  }
  var results = await (models[entity].findAll({
    where: whereCriterion
  }));
  if (!results || !Array.isArray(results)) {
    logger.warn("No such record ", entity, whereCriterion);
    return null;
  }
  if(!raw_values){
    return R.map(result => {
      if (typeof(models[entity].getWhitelistedValues) == "function") {
        return models[entity].getWhitelistedValues(result.dataValues)
      }
      return result.dataValues;
    }, results);
  }
  return R.map(result => { return result.dataValues}, results);
});

const log500Error = (err, req) => {
  logger.info(R.path(["state","sessionId"],req), R.path(["state","requestId"],req),{
    path: req.path,
    originalUrl: req.originalUrl,
    stackTrace: err.stack,
    reqBody: req.body,
    reqParams: req.params,
    reqHeaders: req.headers,
    reqQuery: req.query,
    reqAuth: req.auth
  });
};


const createRecord = (entity, value) => {
  return Either.fromCondition(entity, { message: "Invalid entity in createRecord", entity: entity }, isValidEntity)
    .liftOE()
    .flatMap(entity => {
      return models[entity].tryTo("create", value, { message: "Error while creating " + entity })
    })
    .map(result => result.dataValues)
};

const deleteRecord = (entity, value) => {
  return Either.fromCondition(entity, { message: "Invalid entity in deleteRecord", entity: entity }, isValidEntity)
      .liftOE()
      .flatMap(entity => models[entity].tryTo("destroy", value, { message: "Error while delete " + entity }))
      .map(result => result)
};

const createRecordP = async((entity, value) => {
  if (!isValidEntity(entity)) {
    return null;
  }
  var result = await (models[entity].create(value));
  if (result && result.dataValues) {
    return result.dataValues;
  } else {
    logger.warn("Error creating record ", entity, value);
    return null;
  }
});

const createBulkRecords = (entity, value) => {
  return Either.fromCondition(entity, { message: "Invalid entity in createRecord", entity: entity }, isValidEntity)
    .liftOE()
    .flatMap(entity => models[entity].tryTo("bulkCreate", value, { message: "Error while creating " + entity }))
    .map(result => {
      let dataValues =[];
      for(let item of result){
        dataValues.push(item.dataValues)
      }
      return dataValues})
};

const createBulkRecordsP = async((entity, value) => {
  if (!isValidEntity(entity)) {
    return null;
  }
  var result = await (models[entity].bulkCreate(value));
  if (result && R.is(Object, result)) {
    let dataValues =[];
    for(let item of result){
      dataValues.push(item.dataValues)
    }
    return dataValues;
  } else {
    logger.warn("Error creating bulk records ", entity, value);
    return null;
  }
});

const updateRecordP = async((entity, values, whereCriterion) => {
  let updateResult = await (models[entity].update(values, {
    where: whereCriterion,
    returning: true,
    limit: 1
  }));
  if (updateResult && Array.isArray(updateResult) && updateResult.length > 1) {
    result = R.map(x => x.dataValues, updateResult[1])
    return result[0];
  } else {
    logger.info("Error updating record ", entity, value, whereCriterion);
    return null;
  }
});

const updateBulkRecordP = async((entity, values, whereCriterion) => {
  let updateResult = await (models[entity].update(values, {
    where: whereCriterion,
    returning: true,
    limit: 1
  }));
  if (updateResult && Array.isArray(updateResult) && updateResult.length > 1) {
    result = R.map(x => x.dataValues, updateResult[1])
    return result;
  } else {
    logger.info("Error updating record ", entity, value, whereCriterion);
    return null;
  }
});

const updateRecord = (entity, values, whereCriterion) => {
  return Either.fromCondition(entity, { message: "Invalid entity in updateRecord", entity: entity },
      entity => isValidFindOneRequest(entity, whereCriterion))
    .liftOE()
    .flatMap(entity => updateRecordP(entity, values, whereCriterion).liftOE())
};

const updateBulkRecord = (entity, values, whereCriterion) => {
  return Either.fromCondition(entity, { message: "Invalid entity in updateRecord", entity: entity },
      entity => isValidFindOneRequest(entity, whereCriterion))
    .liftOE()
    .flatMap(entity => updateBulkRecordP(entity, values, whereCriterion).liftOE())
};

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


const findDiffInDays = (start, end) => {
  return moment(start, "DD/MM/YYYY").diff(moment(end, "DD/MM/YYYY"), "days");
};

const findDiffInMinutes = (start, end) => {
  return moment(start, "DD/MM/YYYY").diff(moment(end, "DD/MM/YYYY"), "minutes");
};

const getIndexedRecord = (state, key) => {
  return R.map(record => {
    let indexedRecord = {};
    indexedRecord[record.id] = record
    return indexedRecord;
  }, state[key]);
}

const getUUID = () => {
  let str = uuid.v1();
  return str.substr(1, 34).replace(/-/g,"");
}

const getShortId = () => {
  while(true){
    var temp=shortid.generate().replace(/[-_]/g,"").substr(0,8);
    if(temp.length == 8)
        return temp;
  }
}

const getTS = () => {
  return moment().format();
}

const removeSpaces = (str) => {
  return str;
  // return str.replace(/\r?\n|\r/g, " ").trim().replace(/\s\s+/g, ' ')
}

const logError = err => {
  try {
    logger.info(err);
  } catch (e) {
    console.log("Error while logging ", err, e);
  }
}

const logRequest = state => {
  try {
    logger.info(state.sessionId,state.requestId,state);
  } catch (e) {
    console.log("Error while logging ", state, e);
  }
}


const createArrayOfNameValueFromJson = state => {
  let obj = [];
  for (var key in state){
      var attrName = key;
      var attrValue = state[key];
      obj.push({ "name":key,"value": attrValue})
  }
  return obj;
}

const isValidString = reqstring => {
  let status = false;
  status = R.allPass([
    reqstring => R.is(String, reqstring)
  ])(reqstring);
  return status ? reqstring : reqstring
}

const isValidObject = reqobject => {
  let status = false;
  status = R.allPass([
    reqobject => R.is(Object, reqobject)
  ])(reqobject);
  return status ? reqobject : reqobject
}

exports.findOne = findOne;
exports.logRequest = logRequest;
exports.logError = logError;
exports.log500Error = log500Error;
exports.genericModelOutput = genericModelOutput;
exports.findOrCreateRecord = findOrCreateRecord;
exports.createRecord = createRecord;
exports.findAll = findAll;
exports.updateRecord = updateRecord;
exports.updateRecordP = updateRecordP;
exports.createRecordP = createRecordP;
exports.createBulkRecords = createBulkRecords;
exports.createBulkRecordsP = createBulkRecordsP;
exports.findOneP = findOneP;
exports.deleteRecord = deleteRecord;
exports.getWhitelistedOp = getWhitelistedOp;
exports.findOrCreateRecordP = findOrCreateRecordP;
exports.updateBulkRecord = updateBulkRecord;
exports.isValidString = isValidString;
exports.isValidObject = isValidObject;

