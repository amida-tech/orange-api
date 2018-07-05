"use strict";

const express = require("express");
const mongoose = require("mongoose");
const passport = require("passport");
const jwt = require("jsonwebtoken");
const _ = require("lodash");
const config = require("../../config");
const errors = require("../errors");

const app = module.exports = express();

const User = mongoose.model("User");

app.get("/facebook", passport.authenticate("facebook", { session: false }));

app.get("/facebook/callback", (req, res) => {
    const code = req.query.code;
    res.redirect(`OAuthLogin://authorize?code=${code}`);
});

app.get("/facebook/token", passport.authenticate("facebook", { session: false }), (req, res, next) => {
    const { id, lastName, firstName } = req.user;
    const email = `${id}@facebook.com`;
    const userInfo = { id, idType: "facebook", email };
    const token = jwt.sign(userInfo, config.jwtSecret, { expiresIn: config.jwtExpiresIn || 3600 });
    const register = _.get(req, "query.register", "false") === "true";
    if (register) {
        User.create({
            email,
            firstName,
            lastName
        }, function (err) {
            if (err) {
                return next(err);
            }
            res.status(200);
            res.json({ token });
        });
        return;
    }
    User.findOne({ email }, function(err, user) {
        if (err) {
            return next(err);
        }
        if (!user) {
            return next(errors.ERRORS.USER_NOT_REGISTERED);
        }
        res.status(200);
        res.json({ token });
    });
});