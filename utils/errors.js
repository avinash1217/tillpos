exports.getError = (code, params) => {
  let error = {};
  if (code && errors[code]) {
    error = errors[code];
  } else {
    error = unknownError;
  }
  delete error.name;
  return error;
};

const unknownError = {
  name: "Unknown Error",
  error: "Internal Server Error",
  userMessage: "Service Temporarily Unavailable"
};

const errors = {
  711: {
    name: "Generic Internal Server",
    error: "Internal Server Error",
    userMessage: "Service Temporarily Unavailable"
  }
};