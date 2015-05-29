"use strict";
var express = require('express');
var app = module.exports = express();

var errors = require('../errors.js').ERRORS;
var User = require('../models/user.js');
var AccessToken = require('../models/access_token');

// Request an access token
app.post('/v1/auth/token', function(req, res, next) {
    var email         = req.body.email,
        password      = req.body.password;

    // find the user
    User.authenticate(email, password, function(err, user) {
        if (err) return next(err);

        // generate and save access token for them
        AccessToken.generateSaveAccessToken(user.email, function(err, accessToken) {
            if (err) return next(err);

            // return successful response with access token
            res.send({
                success: true,
                access_token: accessToken.token
            });
        });
    });
});

// authentication middleware
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


