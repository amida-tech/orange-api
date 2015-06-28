"use strict";
var mongoose    = require("mongoose"),
    mongo       = require("mongodb"),
    Grid        = require("gridfs-stream"),
    async       = require("async"),
    zerorpc     = require("zerorpc");

var server; // express server
var zrpc; // zerorpc client
var gfs; // gridfs client

async.waterfall([
    // setup database
    function (callback) {
        // doesn't play with async.apply currying
        mongoose.connect("mongodb://localhost/orange-api", callback);
    },
    // setup gridfs client
    function (callback) {
        gfs = Grid(mongoose.connection.db, mongo);
        callback();
    },
    // setup zerorpc client
    function (callback) {
        zrpc = new zerorpc.Client();
        callback(zrpc.connect("tcp://127.0.0.1:4242"));
    },
    // setup express server
    function (callback) {
        // mongo needs to be connected before we require app.js
        var app = require("./app.js");
        app.set("zerorpc", zrpc);
        app.set("gridfs", gfs);
        server = app.listen(3000, callback);
    }
], function (err) {
    if (err) throw err;
    var host = server.address().address;
    var port = server.address().port;

    console.log("Orange API listening at http://%s:%s", host, port);
});
