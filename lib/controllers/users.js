var express = require('express');
var app = module.exports = express();

var User = require('../models/user.js');
var formatErrors = require('../errors.js');

var authenticate = require('./auth.js').authenticate;

// Create a user
app.post('/v1/user', function(req, res) {
	var email           = req.body.email,
			password	= req.body.password,
			name        = req.body.name;
	if (typeof name === 'undefined') {
		name = '';
	}

	User.create({ email: email, password: password, name: name }, function (err, user) {
		if (err) {
			// Still return a blank email if no email passed
			if (typeof email === 'undefined') {
				email = '';
			}

			res.status(500);
			res.send({
				email: email,
				name: name,
				success: false,
				errors: formatErrors(err)
			});
		} else {
			res.send({
				email: email,
				name: name,
				success: true
			});
		}
	});
});

// basic user info
app.get('/v1/user', authenticate, function(req, res) {
    res.status(200);
    res.send({
        email: req.user.email,
        name: req.user.name,
        success: true
    });
});

// change user info
app.put('/v1/user', authenticate, function(req, res) {
    var name = req.body.name;
    var password = req.body.password;

    // allow blank names
    if (typeof name !== 'undefined') {
        req.user.name = name;
    }
    var changePassword = (typeof password !== 'undefined' && password.length > 0);
    if (changePassword) {
        req.user.password = password;
    }

    // define success and error responses as functions as we have nested callbacks
    function error() {
        res.status(500);
        res.send({
            email: req.user.email,
            name: req.user.name,
            success: false,
            errors: ['unknown_error']
        });
    }
    function success() {
        res.status(200);
        res.send({
            email: req.user.email,
            name: req.user.name,
            success: true
        });
    }

    // attempt to save
    req.user.save(function(err) {
        if (err) {
            error();
        } else {
            // we need to force expire all auth tokens as well
            if (changePassword) {
                req.user.expireAuthTokens(function(err) {
                    if (err) {
                        error();
                    } else {
                        success();
                    }
                });
            } else {
                success();
            }
        }
    });
});
