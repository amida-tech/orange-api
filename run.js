// Setup database
var mongoose = require("mongoose");
var async = require("async");
var autoIncrement = require("mongoose-auto-increment");

var server; // express server

async.waterfall([
    // setup database
    function (callback) {
        // doesn't play with async.apply currying
        mongoose.connect("mongodb://localhost/orange-api", callback);
    },
    // setup numerical IDs
    function (callback) {
        // synchronous
        autoIncrement.initialize(mongoose.connection);
        callback();
    },
    // setup express server
    function (callback) {
        server = require("./app.js").listen(3000, callback);
    }
], function (err) {
    if (err) throw err;
    var host = server.address().address;
    var port = server.address().port;

    console.log('Orange API listening at http://%s:%s', host, port);
});
