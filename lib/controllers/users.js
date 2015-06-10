"use strict";
var express         = require("express"),
    mongoose        = require("mongoose"),
    authenticate    = require("./helpers/auth.js").authenticate;

var app = module.exports = express();

var User = mongoose.model("User");

// Register a new user
app.post("/", function (req, res, next) {
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
app.get("/", authenticate, function (req, res) {
    res.send({
        email: req.user.email,
        name: req.user.name,
        success: true
    });
});

// Set user info
app.put("/", authenticate, function (req, res, next) {
    var name = req.body.name;
    var password = req.body.password;

    // update password if we have a present, non-blank value
    if (typeof password !== "undefined" && password.length > 0) req.user.password = password;

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
