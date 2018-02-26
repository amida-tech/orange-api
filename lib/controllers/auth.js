"use strict";

const express = require("express");
const mongoose = require("mongoose");
const passport = require("passport");

const app = module.exports = express();

const User = mongoose.model("User");

// Request an access token that can be used to authenticate other API
// requests
app.post("/token", function (req, res, next) {
    const email = req.body.email;
    const password = req.body.password;

    // find user and generate access token
    User.authenticate(email, password, function (err, user) {
        if (err) {
            return next(err);
        }
        user.generateSaveAccessToken(function (err, accessToken) {
            // handle errors
            if (err) {
                return next(err);
            }

            // return successful response with access token
            res.status(201);
            res.send({
                success: true,
                access_token: accessToken
            });
        });
    });
});

app.get("/facebook", passport.authenticate("facebook"));

app.get("/facebook/callback",
    passport.authenticate("facebook", { failureRedirect: "/auth/facebook" }),
    (req, res) => {
        const user = JSON.stringify(req.user);
        res.redirect(`OAuthLogin://login?user=${user}`);
    });

