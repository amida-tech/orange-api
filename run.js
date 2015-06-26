"use strict";
var mongoose    = require("mongoose"),
    async       = require("async"),
    zerorpc     = require("zerorpc");

var server; // express server
var client; // zerorpc client

async.waterfall([
    // setup database
    function (callback) {
        // doesn't play with async.apply currying
        mongoose.connect("mongodb://localhost/orange-api", callback);
    },
    // setup zerorpc client
    function (callback) {
        client = new zerorpc.Client();
        callback(client.connect("tcp://127.0.0.1:4242"));
    },
    // setup express server
    function (callback) {
        // mongo needs to be connected before we require app.js
        var app = require("./app.js");
        app.set("zerorpc", client);
        server = app.listen(3000, callback);
    }
], function (err) {
    if (err) throw err;
    var host = server.address().address;
    var port = server.address().port;

    console.log("Orange API listening at http://%s:%s", host, port);
});
