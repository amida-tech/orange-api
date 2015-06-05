"use strict";
var mongoose = require('mongoose');
var async = require('async');

function dropDatabase(done) {
    mongoose.createConnection('localhost', function (err) {
        if (err) return done(err);
        mongoose.connection.db.dropDatabase(done);
    });
    console.log("Database dropped");
}

before(dropDatabase);
after(dropDatabase);
