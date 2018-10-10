const MongoClient = require('mongodb').MongoClient;
const test = require('assert');
const config = require("./config.js");
// Connection url
const url = 'mongodb://localhost:27017';
// Uses this db just as a connection basis 
const dbName = 'test';

// Connect using MongoClient
MongoClient.connect(url, function(err, client) {
  // Use the admin database for the operation
  const adminDb = client.db(dbName).admin();
  // List all the available databases
  adminDb.listDatabases(function(err, dbs) {
    // Finds database name from mongo connection url
    const databaseName = config.mongo.split('/').slice(-1)[0];
    const res = dbs.databases.find((_database) => _database.name === databaseName)
    if (err || res) {
      console.log(`Database Check Failed. Please check to see if the database "${databaseName}" already exists if so please delete it`);
      client.close();
      process.exit(1);
    } else {
      client.close();
    }
  });
});
