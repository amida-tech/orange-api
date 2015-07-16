"use strict";
var express = require("express"),
    auth    = require("./helpers/auth.js"),
    query   = require("./helpers/query.js"),
    crud    = require("./helpers/crud.js"),
    errors  = require("../errors.js").ERRORS;

var router = module.exports = express.Router({ mergeParams: true });
router.use(auth.authenticate); // find user from access token before all requests

// Helpers to DRY up CRUD controllers: see helpers/crud.js
// Fields we want to output in JSON responses (in addition to ID)
var keys = module.exports.keys = ["email"];
var formatObjectCode = crud.formatObjectGenerator(keys),
    formatObject = formatObjectCode(200),
    formatListRequests = crud.formatListGenerator(keys, "requests"),
    formatListRequested = crud.formatListGenerator(keys, "requested"),
    returnData = crud.returnData;

// request access to another user's patient data
router.post("/requested", function (req, res, next) {
    req.user.makeRequest(req.body.email, returnData(res, next));
}, formatObjectCode(201));

// cancel a pending request made by the current user
router.delete("/requested/:requestid", function (req, res, next) {
    req.user.cancelRequest(req.params.requestid, returnData(res, next));
}, formatObject);

// close a request made *to* the current user
router.delete("/requests/:requestid", function (req, res, next) {
    // check a valid status has been specified (this isn't used at the moment, but
    // in the future will be used to notify the user who made the request)
    var status = req.body.status;
    if (["accepted", "rejected"].indexOf(status) < 0) return next(errors.INVALID_STATUS);


    req.user.closeRequest(req.params.requestid, returnData(res, next));
}, formatObject);

// view a listing of all requests made *by* the current user
router.get("/requested", function (req, res, next) {
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
    // email address to filter by
    var email = req.query.email;

    // all data initially
    res.data = req.user.requested;

    // filter to only show requests to the given email address (matches any requests
    // made to an email address that contains email as a substring)
    if (typeof email !== "undefined" && email !== null && email.length > 0) {
        res.data = res.data.filter(function (request) {
            return request.email.indexOf(email) >= 0;
        });
    }

    // limit and offset list
    res.count = res.data.length;
    res.data = res.data.slice(offset, limit + offset);

    // sort list
    if (sortBy === "email") {
        // sort by email (string)
        res.data.sort(function (requestA, requestB) {
            return requestA.email.localeCompare(requestB.email);
        });
    } else {
        // sort by numeric ID
        res.data.sort(function (requestA, requestB) {
            return requestA.id - requestB.id;
        });
    }
    if (sortOrder === "desc") res.data.reverse();

    next();
}, formatListRequested);

// view a listing of all requests made *to* the current user
router.get("/requests", function (req, res, next) {
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
    // email address to filter by
    var email = req.query.email;

    // all requests made initially
    res.data = req.user.requests;

    // filter to only show requests from the given email address (matches any requests
    // made to an email address that contains email as a substring)
    if (typeof email !== "undefined" && email !== null && email.length > 0) {
        res.data = res.data.filter(function (request) {
            return request.email.indexOf(email) >= 0;
        });
    }

    // limit and offset list
    res.count = res.data.length;
    res.data = res.data.slice(offset, limit + offset);

    // sort list
    if (sortBy === "email") {
        // sort by email (string)
        res.data.sort(function (requestA, requestB) {
            return requestA.email.localeCompare(requestB.email);
        });
    } else {
        // sort by numeric ID
        res.data.sort(function (requestA, requestB) {
            return requestA.id - requestB.id;
        });
    }
    if (sortOrder === "desc") res.data.reverse();

    next();
}, formatListRequests);
