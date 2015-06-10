"use strict";
var express     = require("express"),
    mongoose    = require("mongoose");

var app = module.exports = express();
var User = mongoose.model("User");

// Request an access token that can be used to authenticate other API
// requests
app.post("/token", function (req, res, next) {
    var email = req.body.email,
        password = req.body.password;

    // find user and generate access token
    User.authenticate(email, password, function (err, user) {
        if (err) return next(err);
        user.generateSaveAccessToken(function (err, accessToken) {
            // handle errors
            if (err) return next(err);

            // return successful response with access token
            res.status(201);
            res.send({
                success: true,
                access_token: accessToken
            });
        });
    });
});
