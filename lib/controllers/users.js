"use strict";
var express = require('express');
var mongoose = require('mongoose');
var app = module.exports = express();

var User = mongoose.model('User');

var authenticate = require('./auth.js').authenticate;

// Create a user
app.post('/', function(req, res, next) {
	var     email       = req.body.email,
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
app.get('/', authenticate, function(req, res) {
    res.send({
        email: req.user.email,
        name: req.user.name,
        success: true
    });
});

// change user info
app.put('/', authenticate, function(req, res, next) {
    var name = req.body.name;
    var password = req.body.password;

    // whether to update password or not
    if (typeof password !== 'undefined' && password.length > 0) req.user.password = password;

    // allow blank names
    if (typeof name !== 'undefined') req.user.name = name;

    req.user.save(function(err) {
        if (err) return next(err);
        // successful response
        res.send({
            email: req.user.email,
            name: req.user.name,
            success: true
        });
    });
});
