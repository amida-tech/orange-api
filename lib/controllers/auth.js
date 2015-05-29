"use strict";
var express = require('express');
var app = module.exports = express();

var User = require('../models/user.js');
var AccessToken = require('../models/access_token');

// Request an access token
app.post('/v1/auth/token', function(req, res) {
    var email         = req.body.email,
        password      = req.body.password;

    // Check email and password are present
    if (typeof email === 'undefined' || email.length === 0) {
        res.status(403);
        return res.send({
            success: false,
            errors: ['email_required']
        });
    }
    if (typeof password === 'undefined' || password.length === 0) {
        res.status(403);
        return res.send({
            success: false,
            errors: ['password_required']
        });
    }

    // find the user
    User.authenticate(email, password, function(err, user) {
        if (err) {
            // invalid email or password
            res.status(403);
            return res.send({
                success: false,
                errors: ['invalid_email_password']
            });
        }

        AccessToken.generateSaveAccessToken(user.email, function(err, accessToken) {
            if (err) { 
                res.status(500);
                return res.send({
                    success: false,
                    errors: ['unknown_error']
                });
            }

            res.status(200);
            return res.send({
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
        // throw error
        res.status(403);
        res.send({
            success: false,
            errors: ['access_token_required']
        });
    } else {
        // Remove "Bearer " from start of auth
        var accessToken = auth.slice(7);

        // find user and store in request
        AccessToken.authenticate(accessToken, function(err, user) {
            if (err) {
                res.status(403);
                res.send({
                    success: false,
                    errors: ['invalid_access_token']
                });
            } else {
                req.user = user;

                // proceed to handle request as normal
                next();
            }
        });
    }
}


