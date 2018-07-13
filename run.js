"use strict";
var mongoose    = require("mongoose"),
    mongo       = require("mongodb"),
    util        = require("util"),
    Grid        = require("gridfs-stream"),
    async       = require("async"),
    fs          = require("fs"),
    config      = require("./config.js");

var server; // express server
var gfs; // gridfs client

async.waterfall([
    // setup database
    function (callback) {
        var options = {};
        if (config.ssl) {
            options.server = {};
            options.server.ssl = config.ssl;
            if (config.ssl_ca_cert) {
                options.server.sslCA = config.ssl_ca_cert;
            }
        }
        mongoose.connect(config.mongo, options, callback);
    },
    // setup gridfs client
    function (callback) {
        gfs = Grid(mongoose.connection.db, mongo);
        callback();
    },
    // setup express server
    function (callback) {
        // mongo needs to be connected before we require app.js
        var app = require("./app.js");
        app.set("gridfs", gfs);
        server = app.listen(config.port, callback);
    }
], function (err) {
    if (err) throw err;
    var host = server.address().address;
    var port = server.address().port;

    console.log("Orange API listening at http://%s:%s", host, port);
});
