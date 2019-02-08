console.log('delete_db.js: Running...');
const MongoClient = require('mongodb').MongoClient;
const config = require("./config.js");

if (process.env.NODE_ENV !== 'test') {
    console.error('delete_db.js: NODE_ENV !== "test". Therefore, aborting so as to not accidentally drop the wrong database. Ensure NODE_ENV === "test", or just delete your DB manually.');
    process.exit(1);
}

MongoClient.connect(config.mongo, function(err, client) {
    if (err) {
      throw err;
    }

    const db = client.db(config.mongo.split('/').slice(-1)[0]);

    db.dropDatabase(function(err, result){
        if (err) {
            throw err;
        }
        if (result) {
            console.log(`delete_db.js: Database ${config.mongo.split('/').slice(-1)[0]} deleted successfully.`);
        } else {
            console.log(`delete_db.js: Database ${config.mongo.split('/').slice(-1)[0]} NOT deleted.`);
        }
        client.close();
    });
});
