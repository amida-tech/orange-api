// Web
var express = require('express');
var app = express();

// Database
var mongoose = require('mongoose');
mongoose.connect('mongodb://localhost/orange-api');

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

// Parse body params
var bodyParser = require('body-parser');
app.use(bodyParser.json());

// Require controllers
var usersController = require('./lib/controllers/users.js');
app.use(usersController);

var authController = require('./lib/controllers/auth.js');
app.use(authController);

// Error handling
app.use(function (err, req, res, next) {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});

// Run server
var server = app.listen(3000, function () {
    var host = server.address().address;
    var port = server.address().port;

    console.log('Orange API listening at http://%s:%s', host, port);
});
