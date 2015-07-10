"use strict";
var express     = require("express"),
    async       = require("async"),
    crud        = require("./helpers/crud.js"),
    errors      = require("../errors.js").ERRORS,
    medications = require("./medications.js"),
    auth        = require("./helpers/auth.js");

var journal = module.exports = express.Router({ mergeParams: true });

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
    res.data.expand(req.patient);

    // format medications for output
    res.data.medications = res.data.medications.map(function (medication) {
        var output = crud.filter(medication.getData(req.patient), medications.keys);
        output.id = medication._id;
        return output;
    });

    next();
}

// authorize the user against the patient, and then against *all* medications specified
// in medications_id
function authorize(access) {
    return function (req, res, next) {
        // first authorize read access against the patient
        auth.authorize(access)(req, res, function (err) {
            if (err) return next(err);

            // find journal entry from ID
            // TODO: we're making duplicate find calls for every dose endpoint
            req.patient.findJournalEntryById(req.params.journalentry, function (err, entry) {
                if (err) return next(err);

                // authorize against all medication given by medicationid
                // this isn't as slow as it looks: findMedicationById is asynchronous but could
                // just as easily by synchronous
                async.each(entry.medicationIds, function (medId, callback) {
                    req.patient.findMedicationById(medId, function (err, medication) {
                        if (err) return callback(err);
                        callback(medication.authorize(access, req.user, req.patient));
                    });
                }, next);
            });
        });
    };
}

// do the same as the above, but use the medication ID POSTed rather than the one stored
// in the dose given by the doseid in the URL
function authorizeFromData(access) {
    return function (req, res, next) {
        // if medication IDs not specified, then authorize
        if (typeof req.data.medication_ids === "undefined" || req.data.medication_ids === null)
            return next();

        // authorize against all medication given by medicationid
        // this isn't as slow as it looks: findMedicationById is asynchronous but could
        // just as easily by synchronous
        async.each(req.data.medication_ids, function (medId, callback) {
            req.patient.findMedicationById(medId, function (err, medication) {
                // findMedicationById throws 404s but we want 400s
                if (err) {
                    if (err === errors.INVALID_MEDICATION_ID) return callback(errors.INVALID_RESOURCE_MEDICATION_ID);
                    return callback(err);
                }

                // medication_id might not correspond to a medication
                if (!medication) return callback(errors.INVALID_RESOURCE_MEDICATION_ID);

                callback(medication.authorize(access, req.user, req.patient));
            });
        }, next);
    };
}


// Create a new journal entry for the specified patient (requires write access)
journal.post("/", auth.authorize("write"), filterInput, authorizeFromData("write"), function (req, res, next) {
    req.patient.createJournalEntry(req.data, returnData(res, next));
}, formatObjectCode(201)); // return 201 status code

// View a single journal entry for the specified patient
journal.get("/:journalentry", authorize("read"), function (req, res, next) {
    req.patient.findJournalEntryById(req.params.journalentry, returnData(res, next));
}, populateEntry, formatObject);

// Remove a single journal entry for the specified patient (requires write access)
journal.delete("/:journalentry", authorize("write"), function (req, res, next) {
    req.patient.findJournalEntryByIdAndDelete(req.params.journalentry, returnData(res, next));
}, formatObject);

// Update a single journal entry for the specified patient (requires write access)
journal.put("/:journalentry", authorize("write"), filterInput, authorizeFromData("write"), function (req, res, next) {
    req.patient.findJournalEntryByIdAndUpdate(req.params.journalentry, req.data, returnData(res, next));
}, formatObject);

// View a listing of the whole journal for the specified patient
journal.get("/", auth.authorize("read"), function (req, res, next) {
    returnData(res, next)(null, req.patient.entries);
}, formatList);
