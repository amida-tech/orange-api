"use strict";

var mongoose    = require("mongoose"),
    zerorpc     = require("zerorpc");

// for models
var app = require("../../app.js");
// setup zerorpc client (for unit tests)
before(function () {
    var zrpc = new zerorpc.Client();
    zrpc.connect("tcp://127.0.0.1:4242");
    app.set("zerorpc", zrpc);
});

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
