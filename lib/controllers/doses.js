"use strict";
var express     = require("express"),
    moment      = require("moment-timezone"),
    crud        = require("./helpers/crud.js"),
    query       = require("./helpers/query.js"),
    errors      = require("../errors.js").ERRORS,
    auth        = require("./helpers/auth.js"),
    medications = require("./medications.js"),
    DATE_FORMAT = require("../models/helpers/time.js").DATE_FORMAT;

var doses = module.exports = express.Router({ mergeParams: true });

// Helpers to DRY up CRUD controllers: see helpers/crud.js
// Fields we want to output in JSON responses (in addition to ID)
var keys = module.exports.keys = ["medication_id", "date", "notes", "medication"];
var filterInput = crud.filterInputGenerator(keys),
    formatObjectCode = crud.formatObjectGenerator(keys),
    formatObject = formatObjectCode(200),
    formatList = crud.formatListGenerator(keys, "doses"),
    returnData = crud.returnData;

// Usually we just return medication_id, but when viewing a specific
// dose event we expand this out to medication
function populateEntry (req, res, next) {
    // expand out medication field
    res.data.expand(req.patient);
    // format medication for output
    var output = crud.filter(res.data.medication.getData(), medications.keys);
    output.id = res.data.medication._id;
    res.data.medication = output;

    next();
}

// authorize the user against the patient, and then against the medication,
// both with the specified access level
function authorize(access) {
    return function (req, res, next) {
        // first authorize read access against the patient
        auth.authorize(access)(req, res, function (err) {
            if (err) return next(err);

            // find doses from params
            // TODO: we're making duplicate find calls for every dose endpoint
            req.patient.findDoseById(req.params.doseid, function (err, dose) {
                if (err) return next(err);

                // authorize against the medication given by medicationid
                req.patient.findMedicationById(dose.medicationId, function (err, medication) {
                    if (err) return next(err);
                    next(medication.authorize(access, req.user, req.patient));
                });
            });
        });
    };
}

// do the same as the above, but use the medication ID POSTed rather than the one stored
// in the dose given by the doseid in the URL
function authorizeFromData(access) {
    return function (req, res, next) {
        // if medication ID not specified, then authorize
        if (typeof req.data.medication_id === "undefined" || req.data.medication_id === null)
            return next();

        // check we have write access to the medication specified
        req.patient.findMedicationById(req.data.medication_id, function (err, medication) {
            // findMedicationById throws 404s but we want 400s
            if (err) {
                if (err === errors.INVALID_MEDICATION_ID) return next(errors.INVALID_RESOURCE_MEDICATION_ID);
                return next(err);
            }

            // medication_id might not correspond to a medication
            if (!medication) return next(errors.INVALID_RESOURCE_MEDICATION_ID);

            next(medication.authorize(access, req.user, req.patient));
        });
    };
}

// record new dose event belonging to the specified patient and medication
// (specified by patient_id in the URL and medication_id in the POST data respectively)
// requireWrite ensures the current user has write access to the specified patient,
// rather than just any (read _or_ write access)
doses.post("/", auth.authorize("write"), filterInput, function (req, res, next) {
    // check medication_id has been specified before passing to authorizeFromData
    if (typeof req.data.medication_id === "undefined" || req.data.medication_id === null)
        return next(errors.INVALID_RESOURCE_MEDICATION_ID);

    next();
}, authorizeFromData("write"), function (req, res, next) {
    // create new dose event
    req.patient.createDose(req.data, returnData(res, next));
}, formatObjectCode(201)); // return 201 status code

// get a dose event belonging to the specified patient
doses.get("/:doseid", authorize("read"), function (req, res, next) {
    req.patient.findDoseById(req.params.doseid, returnData(res, next));
}, populateEntry, formatObject);

// remove a single dose event belonging to the specified patient (write access required)
doses.delete("/:doseid", authorize("write"), function (req, res, next) {
    req.patient.findDoseByIdAndDelete(req.params.doseid, returnData(res, next));
}, formatObject);

// update a dose event belonging to the specified patient (write access required)
// authorizeFromData ensures we have write access to the new medication_id passed
doses.put("/:doseid", authorize("write"), filterInput, authorizeFromData("write"), function (req, res, next) {
    req.patient.findDoseByIdAndUpdate(req.params.doseid, req.data, returnData(res, next));
}, formatObject);

// view a listing of all dose events belonging to the specified patient
doses.get("/", auth.authorize("read"), function (req, res, next) {
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
    var rawId = req.query.medication_id, medicationId;
    if (typeof rawId === "undefined" || rawId === null || rawId.length === 0) {
        medicationId = null;
    } else {
        // convert from string to int
        medicationId = ~~Number(rawId); // ~~ truncates fractional parts

        // check ID was a valid number
        if (String(medicationId) !== rawId || medicationId < 0)
            return next(errors.INVALID_RESOURCE_MEDICATION_ID);

        // check med with that ID exists
        var med = req.patient.medications.id(medicationId);
        if (!med) return next(errors.INVALID_RESOURCE_MEDICATION_ID);
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

    // all data initially
    res.data = req.patient.doses;

    // filter to only show doses for the specified medication ID
    if (medicationId !== null) {
        res.data = res.data.filter(function (dose) {
            return dose.medicationId === medicationId;
        });
    }

    // filter to only show doses the user has access to
    res.data = res.data.filter(function (dose) {
        var med = req.patient.medications.id(dose.medicationId);
        return med.authorize("read", req.user, req.patient) === null;
    });

    // filter to only show doses in the specified date range
    if (startDate !== null) {
        res.data = res.data.filter(function (dose) {
            return !moment(dose.date).isBefore(startDate);
        });
    }
    if (endDate !== null) {
        res.data = res.data.filter(function (dose) {
            return !moment(dose.date).isAfter(endDate);
        });
    }

    // limit and offset list
    res.count = res.data.length;
    res.data = res.data.slice(offset, limit + offset);

    // sort list
    if (sortBy === "date") {
        // sort by date
        res.data.sort(function (doseA, doseB) {
            var dateA = moment.utc(doseA.date);
            var dateB = moment.utc(doseB.date);

            if (dateA.isBefore(dateB)) return -1;
            else if (dateB.isBefore(dateA)) return 1;
            else return 0;
        });
    } else {
        // sort by numeric ID
        res.data.sort(function (doseA, doseB) {
            return doseA.id - doseB.id;
        });
    }
    if (sortOrder === "desc") res.data.reverse();

    next();
}, formatList);
