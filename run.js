"use strict";
var mongoose    = require("mongoose"),
    mongo       = require("mongodb"),
    Grid        = require("gridfs-stream"),
    async       = require("async"),
    zerorpc     = require("zerorpc"),
    fs          = require("fs");

var server; // express server
var zrpc; // zerorpc client
var gfs; // gridfs client
var secret; // client secret

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
    // read in client secret to be used to authenticate all API requests
    function (callback) {
        fs.readFile(".secret", { encoding: "utf8" }, function (err, s) {
            if (err) return callback(err);
            secret = s.trim();
            callback();
        });
    },
    // setup express server
    function (callback) {
        // mongo needs to be connected before we require app.js
        var app = require("./app.js");
        app.set("zerorpc", zrpc);
        app.set("gridfs", gfs);
        app.set("secret", secret);
        server = app.listen(3000, callback);
    }
], function (err) {
    if (err) throw err;
    var host = server.address().address;
    var port = server.address().port;

    console.log("Orange API listening at http://%s:%s", host, port);
});
