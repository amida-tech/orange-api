"use strict";
var mongoose = require('mongoose');

before(function (done) {
    if (mongoose.connection.db) {
        return done();
    }

    mongoose.connect('mongodb://localhost/orange-api', done);
    mongoose.connection.db.dropDatabase(done);
});

after(function (done) {
    mongoose.connection.db.dropDatabase(done);
});
