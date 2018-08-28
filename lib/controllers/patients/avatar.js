"use strict";
var express = require("express"),
    auth    = require("../helpers/auth.js");

var avatar = module.exports = express.Router({ mergeParams: true });

// View patient avatar
// id must be patientid for authorization middleware to work
avatar.get("/", auth.authenticate, auth.authorize("read"), function (req, res, next) {
    // get patient avatar (or default avatar if they haven't set one yet)
    req.patient.getAvatar(function (err, avatar) {
        if (err) return next(err);

        // set Content-Type header
        res.header("Content-Type", req.patient.avatarType.mime);

        // avatar is a stream containing the image data we can pipe straight to response
        avatar.pipe(res);
    });
});

// set patient avatar
// again id must be patientid for middleware
avatar.post("/", auth.authenticate, auth.authorize("write"), function (req, res, next) {
    req.patient.setAvatar(req, function (err) {
        if (err) return next(err);

        // send link to new avatar URL
        res.status(201);
        res.send({
            avatar: req.patient.avatar,
            success: true
        });
    });
});
