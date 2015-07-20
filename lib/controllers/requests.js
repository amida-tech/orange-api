"use strict";
var express     = require("express"),
    auth        = require("./helpers/auth.js"),
    list        = require("./helpers/list.js"),
    crud        = require("./helpers/crud.js"),
    listModel   = require("../models/helpers/list.js"),
    errors      = require("../errors.js").ERRORS;

var router = module.exports = express.Router({ mergeParams: true });
router.use(auth.authenticate); // find user from access token before all requests

// Helpers to DRY up CRUD controllers: see helpers/crud.js
// Fields we want to output in JSON responses (in addition to ID)
var keys = module.exports.keys = ["email"];
var formatObjectCode = crud.formatObjectGenerator(keys),
    formatObject = formatObjectCode(200),
    formatListRequests = crud.formatListGenerator(keys, "requests"),
    formatListRequested = crud.formatListGenerator(keys, "requested"),
    returnData = crud.returnData,
    returnListData = crud.returnListData;

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
    // check a valid status has been specified (this is only used when notifying
    // the user who made the original request)
    var status = req.body.status;
    if (["accepted", "rejected"].indexOf(status) < 0) return next(errors.INVALID_STATUS);

    req.user.closeRequest(req.params.requestid, status, returnData(res, next));
}, formatObject);

// both list endpoints have identical querying logic, just a different data source
// (user.requests vs user.requested)
var paramParser = list.parseListParameters(["id", "email"], ["email"]);

// view a listing of all requests made *by* the current user
router.get("/requested", paramParser, function (req, res, next) {
    listModel.query(req.user.requested, req.listParameters, null, {}, {}, req.user, null, returnListData(res, next));
}, formatListRequested);

// view a listing of all requests made *to* the current user
router.get("/requests", paramParser, function (req, res, next) {
    listModel.query(req.user.requests, req.listParameters, null, {}, {}, req.user, null, returnListData(res, next));
}, formatListRequests);
