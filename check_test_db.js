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
      console.log(`Database "${databaseName}" already exists. It will not be overwritten or automatically deleted so as to not let developers accidentally wipe their data. If you want to run the unit test suite on this database, first manually delete this DB.`);
      client.close();
      process.exit(1);
    } else {
      client.close();
    }
  });
});
