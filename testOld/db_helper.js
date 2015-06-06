"use strict";
var mongoose = require('mongoose');
var autoIncrement = require("mongoose-auto-increment");
var async = require('async');


//autoIncrement.initialize(mongoose.connection);
before(function(done) {
    mongoose.connect("mongodb://localhost/orange-api", done);
    console.log("Database connected");
});

//before(dropDatabase);
after(dropDatabase);
