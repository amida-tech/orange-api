"use strict";
var express         = require("express"),
    mongoose        = require("mongoose"),
    intersection    = require("array-intersection"),
    async           = require("async"),
    moment          = require("moment-timezone"),
    crud            = require("./helpers/crud.js"),
    query           = require("./helpers/query.js"),
    errors          = require("../errors.js").ERRORS,
    medications     = require("./medications.js"),
    auth            = require("./helpers/auth.js"),
    DATE_FORMAT     = require("../models/helpers/time.js").DATE_FORMAT;

var journal = module.exports = express.Router({ mergeParams: true });

// Helpers to DRY up CRUD controllers: see helpers/crud.js
// Fields we want to output in JSON responses (in addition to ID)
var keys = module.exports.keys = ["date", "text", "medication_ids", "medications", "mood"];
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
    // parse query parameters
    // max number of results to return (for pagination)
    var limit = query.parseNatural(req.query.limit, 25);
    if (limit === null) return next(errors.INVALID_LIMIT);
    // number of results to skip initially (for pagination)
    var offset = query.parseNatural(req.query.offset, 0);
    if (offset === null) return next(errors.INVALID_OFFSET);
    // key to sort by
    var sortBy = query.parseString(req.query.sort_by, ["id", "date"], "id");
    if (sortBy === null) return next(errors.INVALID_SORT_BY);
    // order to sort in
    var sortOrder = query.parseString(req.query.sort_order, ["asc", "desc"], "asc");
    if (sortOrder === null) return next(errors.INVALID_SORT_ORDER);

    // medication ids to filter by
    var medicationIds = req.query.medication_ids;
    if (typeof medicationIds === "undefined" || medicationIds === null) medicationIds = [];
    if (typeof medicationIds === "string") medicationIds = [medicationIds];
    if (typeof medicationIds !== "object" || medicationIds.constructor !== Array)
        return next(errors.INVALID_RESOURCE_MEDICATION_ID);
    for (var i = 0; i < medicationIds.length; i++) {
        // convert from string to int
        var rawId = medicationIds[i];
        var medId = ~~Number(rawId); // ~~ truncates fractional parts

        // check ID was a valid number
        if (String(medId) !== rawId || medId < 0)
            return next(errors.INVALID_RESOURCE_MEDICATION_ID);

        // check med with that ID exists
        var med = req.patient.medications.id(medId);
        if (!med) return next(errors.INVALID_RESOURCE_MEDICATION_ID);

        // valid ID
        medicationIds[i] = medId;
    }

    // start and end date to filter by
    var startDate = req.query.start_date;
    var endDate = req.query.end_date;
    if (typeof startDate === "undefined" || startDate === "") startDate = null;
    if (typeof endDate === "undefined" || endDate === "") endDate = null;
    // validate they're ISO8601 full datetimes and parse
    if (startDate !== null) {
        startDate = moment.utc(startDate, DATE_FORMAT);
        if (!startDate.isValid()) return next(errors.INVALID_START_DATE);
    }
    if (endDate !== null) {
        endDate = moment.utc(endDate, DATE_FORMAT);
        if (!endDate.isValid()) return next(errors.INVALID_END_DATE);
    }
    // check the start date is before the end date
    if (startDate !== null && endDate !== null) {
        if (startDate.isAfter(endDate)) return next(errors.INVALID_START_DATE);
    }

    // filter by text field
    var text = req.query.text;

    // all data initially
    res.data = req.patient.entries;

    // filter to only show entries including all medication IDs specified
    res.data = res.data.filter(function (entry) {
        return medicationIds.every(function (medId) {
            return entry.medicationIds.indexOf(medId) >= 0;
        });
    });

    // filter to only show entries the user has access to
    res.data = res.data.filter(function (entry) {
        return entry.medicationIds.every(function (medId) {
            var med = req.patient.medications.id(medId);
            return med.authorize("read", req.user, req.patient) === null;
        });
    });

    // filter to only show entries in the specified date range
    if (startDate !== null) {
        res.data = res.data.filter(function (entry) {
            return !moment(entry.date).isBefore(startDate);
        });
    }
    if (endDate !== null) {
        res.data = res.data.filter(function (entry) {
            return !moment(entry.date).isAfter(endDate);
        });
    }

    // filter by text
    if (typeof text !== "undefined" && text !== null && text.length !== 0) {
        var keys = mongoose.model("JournalEntry").metaphone(text);

        // use stored metaphone values for fuzzy matching
        res.data = res.data.filter(function (entry) {
            return intersection(entry._s_text, keys).length > 0;
        });
    }

    // limit and offset list
    res.count = res.data.length;
    res.data = res.data.slice(offset, limit + offset);

    // sort list
    if (sortBy === "date") {
        // sort by date
        res.data.sort(function (entryA, entryB) {
            var dateA = moment.utc(entryA.date);
            var dateB = moment.utc(entryB.date);

            if (dateA.isBefore(dateB)) return -1;
            else if (dateB.isBefore(dateA)) return 1;
            else return 0;
        });
    } else {
        // sort by numeric ID
        res.data.sort(function (entryA, entryB) {
            return entryA.id - entryB.id;
        });
    }
    if (sortOrder === "desc") res.data.reverse();

    next();
}, formatList);
