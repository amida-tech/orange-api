"use strict";
var express         = require("express"),
    async           = require("async"),
    crud            = require("../helpers/crud.js"),
    auth            = require("../helpers/auth.js"),
    errors          = require("../../errors.js").ERRORS,
    EMAIL_REGEXP    = require("../../models/helpers/email.js");

var shared = module.exports = express.Router({ mergeParams: true });

// Helpers to DRY up CRUD controllers: see helpers/crud.js
// Fields we want to output in JSON responses (in addition to ID)
var inputKeys = ["email", "access", "group"];
var keys = inputKeys.concat(["is_user"]);
var filterInput         = crud.filterInputGenerator(inputKeys),
    formatObjectCode    = crud.formatObjectGenerator(keys),
    formatObject        = formatObjectCode(200),
    formatObject201     = formatObjectCode(201),
    formatList          = crud.formatListGenerator(keys, "shares"),
    returnData          = crud.returnData;

// share a patient with a user
shared.post("/", auth.authenticate, auth.authorize("write"), filterInput, function (req, res, next) {
    // a valid email address must be specified
    var email = req.data.email;
    if (typeof email === "undefined" || email === null || email.length === 0) return next(errors.EMAIL_REQUIRED);
    if (!EMAIL_REGEXP.test(email)) return next(errors.INVALID_EMAIL);

    // a valid (prime/family/anyone NOT owner) group must be specified
    var group = req.data.group;
    if (typeof group === "undefined" || group === null || group.length === 0) return next(errors.GROUP_REQUIRED);
    if (["prime", "family", "anyone"].indexOf(group) < 0) return next(errors.INVALID_GROUP);

    // a valid (read/write/default) access level must be specified
    var access = req.data.access;
    if (typeof access === "undefined" || access === null || access.length === 0) return next(errors.ACCESS_REQUIRED);
    if (["read", "write", "default"].indexOf(access) < 0) return next(errors.INVALID_ACCESS);

    // create share
    req.patient.share(email, access, group, function (err, patient) {
        if (err) return next(err);

        // return share details (with is_user)
        patient.shareForEmail(email).format(returnData(res, next));
    });
}, formatObject201);


// get a list of all shares
shared.get("/", auth.authenticate, auth.authorize("read"), function (req, res, next) {
    // at the moment return all shares TODO: querying
    var shares = req.patient.shares;

    // format shares for output (key: adds is_user field)
    async.map(shares, function (share, callback) {
        return share.format(callback);
    }, returnData(res, next));
}, formatList);
