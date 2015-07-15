"use strict";
var express         = require("express"),
    mongoose        = require("mongoose"),
    errors          = require("../errors.js").ERRORS,
    authenticate    = require("./helpers/auth.js").authenticate;

var users = module.exports = express.Router({ mergeParams: true });

var User = mongoose.model("User");

// Register a new user
users.post("/", function (req, res, next) {
    User.create({
        email: req.body.email,
        password: req.body.password,
        firstName: req.body.first_name,
        lastName: req.body.last_name,
        phone: req.body.phone
    }, function (err, user) {
        if (err) return next(err);

        // successful response
        res.status(201);
        res.send({
            email: user.email,
            first_name: user.firstName,
            last_name: user.lastName,
            phone: user.phone,
            success: true
        });
    });
});

// Get basic user info
users.get("/", authenticate, function (req, res) {
    res.send({
        email: req.user.email,
        first_name: req.user.firstName,
        last_name: req.user.lastName,
        phone: req.user.phone,
        success: true
    });
});

// Set user info
users.put("/", authenticate, function (req, res, next) {
    var firstName = req.body.first_name;
    var lastName = req.body.last_name;
    var password = req.body.password;
    var phone = req.body.phone;

    // update password if we have a present, non-blank value
    if (typeof password !== "undefined") {
        if (password === null || password.length === 0) return next(errors.PASSWORD_REQUIRED);
        req.user.password = password;
    }

    // allow blank names and phones
    if (typeof first_name !== "undefined") req.user.firstName = firstName;
    if (typeof last_name !== "undefined") req.user.lastName = lastName;
    if (typeof phone !== "undefined") req.user.phone = phone;

    req.user.save(function (err) {
        if (err) return next(err);

        // successful response
        res.send({
            email: req.user.email,
            first_name: req.user.firstName,
            last_name: req.user.lastName,
            phone: req.user.phone,
            success: true
        });
    });
});

// Delete user
users.delete("/", authenticate, function (req, res, next) {
    req.user.remove(function (err) {
        if (err) return next(err);

        // successful response
        res.send({
            email: req.user.email,
            first_name: req.user.firstName,
            last_name: req.user.lastName,
            phone: req.user.phone,
            success: true
        });
    });
});
