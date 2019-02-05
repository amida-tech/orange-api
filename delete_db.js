// newdb is the database we drop
const MongoClient = require('mongodb').MongoClient;
const config = require("./config.js");

// make client connect to mongo service
MongoClient.connect(config.mongo, function(err, client) {

    if (err) throw err;
    const db = client.db(config.mongo.split('/').slice(-1)[0]);

    db.dropDatabase(function(err, result){
        if (err) {
            throw err;
        }
        if (result) {
            console.log(`Database ${config.mongo.split('/').slice(-1)[0]} deleted successfully.`);
        } else {
            console.log(`Database ${config.mongo.split('/').slice(-1)[0]} NOT deleted.`);
        }
        client.close();
    });
});
