"use strict";
var express         = require("express"),
    async           = require("async"),
    crud            = require("../helpers/crud.js"),
    auth            = require("../helpers/auth.js"),
    query           = require("../helpers/query.js"),
    errors          = require("../../errors.js").ERRORS,
    EMAIL_REGEXP    = require("../../models/helpers/email.js");

var shared = module.exports = express.Router({ mergeParams: true });

// Helpers to DRY up CRUD controllers: see helpers/crud.js
// Fields we want to output in JSON responses (in addition to ID)
var modifyKeys = ["access", "group"];
var inputKeys = modifyKeys.concat(["email"]);
var keys = module.exports.keys = inputKeys.concat(["is_user"]);
var filterInput         = crud.filterInputGenerator(inputKeys),
    modifyFilterInput   = crud.filterInputGenerator(modifyKeys),
    formatObjectCode    = crud.formatObjectGenerator(keys),
    formatObject        = formatObjectCode(200),
    formatObject201     = formatObjectCode(201),
    formatList          = crud.formatListGenerator(keys, "shares"),
    returnData          = crud.returnData;

// a callback to accept a share, format it for output, and store it in res.data
var returnShare = function (res, next) {
    return function (err, share) {
        if (err) return next(err);
        share.format(returnData(res, next));
    };
};

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

    // create share and format it for output (i.e., add is_user field)
    req.patient.createShare(email, access, group, returnShare(res, next));
}, formatObject201);

// remove a share (i.e., stop sharing with that user)
shared.delete("/:shareid", auth.authenticate, auth.authorize("write"), function (req, res, next) {
    // remove share and format it for output
    req.patient.removeShare(req.params.shareid, returnShare(res, next));
}, formatObject);

// update a share
shared.put("/:shareid", auth.authenticate, auth.authorize("write"), modifyFilterInput, function (req, res, next) {
    // update share and format it for output
    // req.data already filtered for us
    req.patient.updateShare(req.params.shareid, req.data, returnShare(res, next));
}, formatObject);

// get a list of all shares
shared.get("/", auth.authenticate, auth.authorize("read"), function (req, res, next) {
    // parse query parameters
    // max number of results to return (for pagination)
    var limit = query.parseNatural(req.query.limit, 25);
    if (limit === null) return next(errors.INVALID_LIMIT);
    // number of results to skip initially (for pagination)
    var offset = query.parseNatural(req.query.offset, 0);
    if (offset === null) return next(errors.INVALID_OFFSET);
    // key to sort by
    var sortBy = query.parseString(req.query.sort_by, ["id", "email"], "id");
    if (sortBy === null) return next(errors.INVALID_SORT_BY);
    // order to sort in
    var sortOrder = query.parseString(req.query.sort_order, ["asc", "desc"], "asc");
    if (sortOrder === null) return next(errors.INVALID_SORT_ORDER);

    // shares must be to an existing user
    var isUser = req.query.is_user;
    // parse
    if (typeof isUser === "undefined" || isUser === null || isUser.length === 0) isUser = null;
    else if (isUser === "true") isUser = true;
    else if (isUser === "false") isUser = false;
    // validate
    if (isUser !== null && isUser !== true && isUser !== false) return next(errors.INVALID_IS_USER);

    // filter shares by the share group they belong to (owner/prime/family/anyone)
    var group = query.parseString(req.query.group, ["owner", "prime", "family", "anyone"], "all");
    // query.parseString returns errors as null, but after that we use null for a nonpresent value
    if (group === null) return next(errors.INVALID_GROUP);
    else if (group === "all") group = null;

    // filter shares by the access level they have (read/write)
    // matches exactly: write shares do not show up when querying for read shares even they though
    // imply read access
    var access = query.parseString(req.query.access, ["read", "write"], "all");
    // query.parseString returns errors as null, but after that we use null for a nonpresent value
    if (access === null) return next(errors.INVALID_ACCESS);
    else if (access === "all") access = null;

    // filter shares by email (matches exactly)
    var email = req.query.email;

    // all data initially, formatted for output (so we have the is_user field to query on)
    // format shares for output (key: adds is_user field)
    async.map(req.patient.shares, function (share, callback) {
        return share.format(callback);
    }, function (err, shares) {
        if (err) return next(err);
        res.data = shares;

        // filter to find shares that do/don't belong to an existing user
        if (isUser !== null) {
            res.data = res.data.filter(function (share) {
                return share.is_user === isUser;
            });
        }

        // filter to find shares for a certain group
        if (group !== null) {
            res.data = res.data.filter(function (share) {
                return share.group === group;
            });
        }

        // filter to find shares for a certain access level
        if (access !== null) {
            res.data = res.data.filter(function (share) {
                if (share.access === "read" && access === "read") return true;
                if (share.access === "write" && access === "write") return true;
                if (share.access === "default" && req.patient.permissions[share.group] === access) return true;
                return false;
            });
        }

        // filter to find shares with a certain email address (match exactly *not* fuzzily like elsewhere)
        if (typeof email !== "undefined" && email !== null && email.length !== 0) {
            res.data = res.data.filter(function (share) {
                return share.email === email;
            });
        }

        // limit and offset list
        res.count = res.data.length;
        res.data = res.data.slice(offset, limit + offset);

        // sort list
        if (sortBy === "email") {
            // sort by string email
            res.data.sort(function (shareA, shareB) {
                return shareA.email.localeCompare(shareB.email);
            });
        } else {
            // sort by numeric ID
            res.data.sort(function (shareA, shareB) {
                return shareA.id - shareB.id;
            });
        }
        if (sortOrder === "desc") res.data.reverse();

        next();
    });
}, formatList);
