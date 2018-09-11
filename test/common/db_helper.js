"use strict";

var mongoose = require("mongoose");
var config   = require("../../config.js");

// for models
var app = require("../../app.js"); //eslint-disable-line no-unused-vars

// setup DB connection (not used for REST endpoints, but we're doing
// unit test-esque things in here)
before(function (done) {
    var options = {
        useNewUrlParser: true
    };
    if (config.sslEnabled) {
        options.server = {};
        options.server.ssl = config.sslEnabled;
        if (config.sslCaCert) {
            options.server.sslCA = config.sslCaCert;
        }
    }
    mongoose.connect(config.mongo, options, done);
});

// close DB connection afterwards (and reopen for dropping DB, but
// we handle that separately in grunt)
after(function (done) {
    mongoose.disconnect(done);
});
