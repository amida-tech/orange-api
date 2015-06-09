// Setup database
var mongoose = require("mongoose");
var async = require("async");

var server; // express server

async.waterfall([
    // setup database
    function (callback) {
        // doesn't play with async.apply currying
        mongoose.connect("mongodb://localhost/orange-api", callback);
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
