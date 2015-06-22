"use strict";
var express = require("express"),
    crud    = require("./helpers/crud.js"),
    auth    = require("./helpers/auth.js");

var journal = module.exports = express();

// Helpers to DRY up CRUD controllers: see helpers/crud.js
// Fields we want to output in JSON responses (in addition to ID)
var keys = ["date", "text", "medication_ids", "medications", "mood"];
var filterInput = crud.filterInputGenerator(keys),
    formatObjectCode = crud.formatObjectGenerator(keys.concat(["hashtags"])),
    formatObject = formatObjectCode(200),
    formatList = crud.formatListGenerator(keys, "entries"),
    returnData = crud.returnData;

// Usually we just return medication_ids, but when viewing a specific
// journal entry we expand this out to medications
function populateEntry (req, res, next) {
    // TODO: filter keys on this
    res.data.expand(next);
}

// Create a new journal entry for the specified patient (requires write access)
journal.post("/", auth.requireWrite, filterInput, function (req, res, next) {
    req.patient.createJournalEntry(req.data, returnData(res, next));
}, formatObjectCode(201)); // return 201 status code

// View a single journal entry for the specified patient
journal.get("/:journalentry", function (req, res, next) {
    req.patient.findJournalEntryById(req.params.journalentry, returnData(res, next));
}, populateEntry, formatObject);

// Remove a single journal entry for the specified patient (requires write access)
journal.delete("/:journalentry", auth.requireWrite, function (req, res, next) {
    req.patient.findJournalEntryByIdAndDelete(req.params.journalentry, returnData(res, next));
}, formatObject);

// Update a single journal entry for the specified patient (requires write access)
journal.put("/:journalentry", auth.requireWrite, filterInput, function (req, res, next) {
    req.patient.findJournalEntryByIdAndUpdate(req.params.journalentry, req.data, returnData(res, next));
}, formatObject);

// View a listing of the whole journal for the specified patient
journal.get("/", function (req, res, next) {
    returnData(res, next)(null, req.patient.entries);
}, formatList);
