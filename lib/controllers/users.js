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
    console.log('are we ever here?');
    res.status(200);
    res.send({
        email: req.user.email,
        name: req.user.name,
        success: true
    });
});
