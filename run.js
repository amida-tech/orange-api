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
        if (config.sslEnabled) {
            options.ssl = config.sslEnabled;
            // Commented out by ARH on 2019-05-22 because was breaking production.
            // Hot"fix" commenting this out because we need to get production back up and running while we figure out how to get this properly working.
            // options.sslValidate = true;
            options.sslCA = config.sslCaCert;
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
