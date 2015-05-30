"use strict";
var express = require('express');
var app = module.exports = express();

var User = require('../models/user.js');

var authenticate = require('./auth.js').authenticate;

// Create a user
app.post('/v1/user', function(req, res, next) {
	var email           = req.body.email,
			password	= req.body.password,
			name        = req.body.name;

	User.create({ email: email, password: password, name: name }, function (err, user) {
        if (err) return next(err);
        
        // successful response
        res.status(201);
        res.send({
            email: user.email,
            name: user.name,
            success: true
        });
	});
});

// basic user info
app.get('/v1/user', authenticate, function(req, res) {
    res.send({
        email: req.user.email,
        name: req.user.name,
        success: true
    });
});

// change user info
app.put('/v1/user', authenticate, function(req, res, next) {
    var name = req.body.name;
    var password = req.body.password;

    // whether to update password or not
    var changePassword = (typeof password !== 'undefined' && password.length > 0);
    if (changePassword) req.user.password = password;

    // allow blank names
    if (typeof name !== 'undefined') req.user.name = name;

    req.user.save(function(err) {
        if (err) return next(err);

        if (changePassword) {
            // need to force expire all auth tokens as well
            req.user.expireAuthTokens(function(err) {
                if (err) return next(err);

                // successful response
                res.send({
                    email: req.user.email,
                    name: req.user.name,
                    success: true
                });
            });
        } else {
            // successful response
            res.send({
                email: req.user.email,
                name: req.user.name,
                success: true
            });

        }
    });
});
