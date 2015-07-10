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
        name: req.body.name
    }, function (err, user) {
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

// Get basic user info
users.get("/", authenticate, function (req, res) {
    res.send({
        email: req.user.email,
        name: req.user.name,
        success: true
    });
});

// Set user info
users.put("/", authenticate, function (req, res, next) {
    var name = req.body.name;
    var password = req.body.password;

    // update password if we have a present, non-blank value
    if (typeof password !== "undefined") {
        if (password === null || password.length === 0) return next(errors.PASSWORD_REQUIRED);
        req.user.password = password;
    }

    // allow blank names
    if (typeof name !== "undefined") req.user.name = name;

    req.user.save(function (err) {
        if (err) return next(err);

        // successful response
        res.send({
            email: req.user.email,
            name: req.user.name,
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
            name: req.user.name,
            success: true
        });
    });
});
