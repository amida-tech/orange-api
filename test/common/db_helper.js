"use strict";

var mongoose = require("mongoose");

// for models
var app = require("../../app.js"); //eslint-disable-line no-unused-vars

// setup DB connection (not used for REST endpoints, but we're doing
// unit test-esque things in here)
before(function (done) {
    mongoose.connect("mongodb://localhost/orange-api", done);
});

// close DB connection afterwards (and reopen for dropping DB, but
// we handle that separately in grunt)
after(function (done) {
    mongoose.disconnect(done);
});
