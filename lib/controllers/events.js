"use strict";
var express         = require("express"),
    crud            = require("./helpers/crud.js"),
    auth            = require("./helpers/auth.js"),
    list            = require("./helpers/list.js");

var events = module.exports = express.Router({ mergeParams: true });

// Helpers to DRY up CRUD controllers: see helpers/crud.js
// Fields we want to output in JSON responses (in addition to ID)
var keys = module.exports.keys = ["date", "location", "name", "description", "eventLength"];
var filterInput = crud.filterInputGenerator(keys),
    formatObjectCode = crud.formatObjectGenerator(keys),
    formatObject = formatObjectCode(200),
    formatList = crud.formatListGenerator(keys, "events"),
    returnData = crud.returnData,
    returnListData = crud.returnListData;

events.post("/", auth.authorize("write"), filterInput, function (req, res, next) {
    req.patient.createEvent(req.data, returnData(res, next));
}, formatObjectCode(201));


events.get("/:eventid", auth.authorize("read"), function (req, res, next) {
    req.patient.findEventById(req.params.eventid, returnData(res, next));
}, formatObject);

events.delete("/:eventid", auth.authorize("write"), function (req, res, next) {
    req.patient.findEventByIdAndDelete(req.params.eventid, returnData(res, next));
}, formatObject);

events.put("/:eventid", auth.authorize("write"), filterInput, function (req, res, next) {
    req.patient.findEventByIdAndUpdate(req.params.eventid, req.data, returnData(res, next));
}, formatObject);

var paramParser = list.parseListParameters(["id", "name"], ["name", "start_date", "end_date"]);
events.get("/", auth.authorize("read"), paramParser, list.parseDateFilters, function (req, res, next) {
    req.patient.queryEvents(req.listParameters, req.user, req.patient, returnListData(res, next));
}, formatList);
