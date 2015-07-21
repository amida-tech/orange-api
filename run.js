"use strict";
var mongoose    = require("mongoose"),
    mongo       = require("mongodb"),
    util        = require("util"),
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
        // let docker specify a remote host if present, otherwise use localhost
        var host = process.env.MONGO_PORT_27017_TCP_ADDR;
        if (typeof host === "undefined" || host === null || host.length === 0) host = "localhost";

        var url = util.format("mongodb://%s/orange-api", host);
        mongoose.connect(url, callback);
    },
    // setup gridfs client
    function (callback) {
        gfs = Grid(mongoose.connection.db, mongo);
        callback();
    },
    // setup zerorpc client
    function (callback) {
        // let docker specify a remote host if present, otherwise use localhost
        var host = process.env.MATCHER_PORT_4242_TCP_ADDR;
        if (typeof host === "undefined" || host === null || host.length === 0) host = "127.0.0.1";

        var url = util.format("tcp://%s:4242", host);
        zrpc = new zerorpc.Client();
        callback(zrpc.connect(url));
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
        server = app.listen(3000, "localhost", callback);
    }
], function (err) {
    if (err) throw err;
    var host = server.address().address;
    var port = server.address().port;

    console.log("Orange API listening at http://%s:%s", host, port);
});
