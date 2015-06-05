"use strict";
var express = require('express');
var app = module.exports = express();
var async = require('async');
var mongoose = require('mongoose');

var errors = require('../errors.js').ERRORS;
var User = mongoose.model('User');
var AccessToken = mongoose.model('AccessToken');

// Request an access token that can be used to authenticate other API
// requests
app.post('/token', function(req, res, next) {
    var email         = req.body.email,
        password      = req.body.password;

    // find user and generate access token
    var genToken = async.seq(User.authenticate.bind(User), AccessToken.generateSaveAccessToken.bind(AccessToken));
    genToken(email, password, function (err, accessToken) {
        // handle errors
        if (err) return next(err);

        // return successful response with access token
        res.status(201);
        res.send({
            success: true,
            access_token: accessToken.token
        });
    });
});

// authentication middleware to be called in the rest of the API
app.authenticate = function authenticate(req, res, next) {
    var auth = req.headers.authorization;

    // must be of the form "Bearer xxx" where xxx is a (variable-length)
    // access token
    if (typeof auth === 'undefined' || auth.indexOf('Bearer') !== 0) {
        return next(errors.ACCESS_TOKEN_REQUIRED);
    }

    // Remove "Bearer " from start of auth
    var accessToken = auth.slice(7);

    // find user and store in request
    AccessToken.authenticate(accessToken, function(err, user) {
        if (err) return next(err);

        req.user = user;
        // proceed to handle request as normal
        next();
    });
}
