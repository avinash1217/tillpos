const config = {
  "development": {
    "username": process.env.DB_USER || "cloud",
    "password": process.env.DB_PASSWORD || "scape",
    "database": process.env.DB_NAME || "tillPosdb",
    "host": process.env.DB_HOST || "localhost",
    "dialect": "postgres",
    "benchmark": true,
    "pool": {
      max: 300
    },
    "prefix": "A",
    "txnPrefix": ["A", "B", "C", "D"],
    "schema": "public"
  },
  "uat": {
    "username": process.env.DB_USER,
    "password": process.env.DB_PASSWORD,
    "database": process.env.DB_NAME,
    "host": process.env.DB_HOST,
    "dialect": "postgres",
    "prefix": "A",
    "txnPrefix": ["A", "B", "C", "D"],
    "schema": "public"
  },
  "prod": {
    "username": process.env.DB_USER,
    "password": process.env.DB_PASSWORD,
    "database": process.env.DB_NAME,
    "host": process.env.DB_HOST,
    "dialect": "postgres",
    "prefix": "A",
    "txnPrefix": ["A", "B", "C", "D"],
    "schema": "public"
  }
}


module.exports = config;
