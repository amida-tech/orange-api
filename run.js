"use strict";
var mongoose    = require("mongoose"),
    util        = require("util"),
    mongodb     = require("mongodb"),
    async       = require("async"),
    fs          = require("fs"),
    config      = require("./config.js");

var server; // express server
var gfs; // gridfs client

async.waterfall([
    // setup database
    function (callback) {
        var options = {
            useNewUrlParser: true
        };
        if (config.ssl) {
            options.server = {};
            options.server.ssl = config.ssl;
            if (config.ssl_ca_cert) {
                options.server.sslCA = config.ssl_ca_cert;
            }
        }
        mongoose.connect(config.mongo, options, callback).catch((err) => {
            console.error(err);
        });
    },
    // setup gridfs client
    function (connection, callback) {
        gfs = new mongodb.GridFSBucket(mongoose.connection.db);
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
