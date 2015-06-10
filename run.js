"use strict";
var mongoose    = require("mongoose"),
    async       = require("async");

var server; // express server

async.waterfall([
    // setup database
    function (callback) {
        // doesn't play with async.apply currying
        mongoose.connect("mongodb://localhost/orange-api", callback);
    },
    // setup express server
    function (callback) {
        // mongo needs to be connected before we require app.js
        server = require("./app.js").listen(3000, callback);
    }
], function (err) {
    if (err) throw err;
    var host = server.address().address;
    var port = server.address().port;

    console.log("Orange API listening at http://%s:%s", host, port);
});
