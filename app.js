"use strict";
// Web
var express = require('express');
var app = module.exports = express();

// Database
var mongoose = require('mongoose');
var autoIncrement = require('mongoose-auto-increment');
mongoose.connect('mongodb://localhost/orange-api');
autoIncrement.initialize(mongoose.connection); // for numerical IDs

// CORS
app.use(function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Credentials", true);
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELTE");
    next();
});

// Prevent caching
app.disable('etag');

// Parse body params from JSON
var bodyParser = require('body-parser');
app.use(bodyParser.json());

// All models: in all other files, just used mongoose.model(NAME)
// rather than requiring these directly
require('./lib/models/user.js');
require('./lib/models/access_token.js');
require('./lib/models/patient.js');

// App-level router containing all routes
var router = express.Router();

// Authentication tokens
router.use('/auth', require('./lib/controllers/auth.js'));

// User registration/signup
router.use('/user', require('./lib/controllers/users.js'));

// Patient CRUD and sharing
router.use('/patients', require('./lib/controllers/patients.js'));

// Routes for a specific patient
// var userRouter = express.Router();
// userRouter.use(require('./lib/controllers/habits.js'));
// userRouter.use('doctors', require('./lib/controllers/doctors.js'));
// router.use('/user/', userRouter);

// Mount everything under versioned endpoint
app.use('/v1', router);

// Error handling middleware
var errorHandler = require('./lib/error_handler.js');
app.use(errorHandler);
