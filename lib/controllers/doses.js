"use strict";
var express = require("express"),
    crud = require("./helpers/crud.js"),
    list = require("./helpers/list.js"),
    errors = require("../errors.js").ERRORS,
    auth = require("./helpers/auth.js"),
    medications = require("./medications.js");

var doses = module.exports = express.Router({
    mergeParams: true
});

// Helpers to DRY up CRUD controllers: see helpers/crud.js
// Fields we want to output in JSON responses (in addition to ID)
var keys = module.exports.keys = ["medication_id", "date", "dose", "notes", "medication", "taken", "scheduled", "creator"];
var filterInput = crud.filterInputGenerator(keys),
    formatObjectCode = crud.formatObjectGenerator(keys),
    formatObject = formatObjectCode(200),
    formatList = crud.formatListGenerator(keys, "doses"),
    formatListFirstMonth = function(req, res) {
        var data = [];
        var min_date;

        for (var i = 0; i < res.data.length; i++) {
            var rawDatum = res.data[i];
            // if rawDatum responds to getData, call it (see formatObjectGenerator for explanation)
            if (typeof rawDatum.getData === "function") rawDatum = rawDatum.getData(req.patient);

            var datum = crud.filter(rawDatum, ["date"]);
            //datum.id = rawDatum._id;

            if (!min_date) {
                min_date = datum.date.utc;
            }
            if (min_date > datum.date.utc) {
                min_date = datum.date.utc;
            }
        }

        // default to counting length of data
        var count = res.count;
        if (typeof count !== "number") count = data.length;



        var resp = {
            count: count,
            success: true
        };

        resp.min_dose_date = min_date;
        res.send(resp);
    },

    returnData = crud.returnData,
    returnListData = crud.returnListData;

// Usually we just return medication_id, but when viewing a specific
// dose event we expand this out to medication
function populateEntry(req, res, next) {
    // expand out medication field
    res.data.expand(req.patient);
    // format medication for output
    var output = crud.filter(res.data.medication.getData(req.patient), medications.keys);
    output.id = res.data.medication._id;
    res.data.medication = output;

    next();
}

// authorize the user against the patient, and then against the medication,
// both with the specified access level
function authorize(access) {
    return function(req, res, next) {
        // first authorize read access against the patient
        auth.authorize(access)(req, res, function(err) {
            if (err) return next(err);

            // find doses from params
            // TODO: we're making duplicate find calls for every dose endpoint
            req.patient.findDoseById(req.params.doseid, function(err, dose) {
                if (err) return next(err);

                // authorize against the medication given by medicationid
                req.patient.findMedicationById(dose.medicationId, function(err, medication) {
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
    return function(req, res, next) {
        // if medication ID not specified, then authorize
        if (typeof req.data.medication_id === "undefined" || req.data.medication_id === null)
            return next();

        // check we have write access to the medication specified
        req.patient.findMedicationById(req.data.medication_id, function(err, medication) {
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
doses.post("/", auth.authorize("write"), filterInput, function(req, res, next) {
    // check medication_id has been specified before passing to authorizeFromData
    if (typeof req.data.medication_id === "undefined" || req.data.medication_id === null)
        return next(errors.INVALID_RESOURCE_MEDICATION_ID);

    next();
}, authorizeFromData("write"), function(req, res, next) {
    // create new dose event
    req.patient.createDose(Object.assign({}, req.data, { user: req.user }), returnData(res, next));
}, formatObjectCode(201)); // return 201 status code

// get a dose event belonging to the specified patient
doses.get("/:doseid", authorize("read"), function(req, res, next) {
    req.patient.findDoseById(req.params.doseid, returnData(res, next));
}, populateEntry, formatObject);

// remove a single dose event belonging to the specified patient (write access required)
doses.delete("/:doseid", authorize("write"), function(req, res, next) {
    req.patient.findDoseByIdAndDelete(req.params.doseid, returnData(res, next));
}, formatObject);

// update a dose event belonging to the specified patient (write access required)
// authorizeFromData ensures we have write access to the new medication_id passed
doses.put("/:doseid", authorize("write"), filterInput, authorizeFromData("write"), function(req, res, next) {
    req.patient.findDoseByIdAndUpdate(req.params.doseid, req.data, returnData(res, next));
}, formatObject);

// view a listing of all dose events belonging to the specified patient
var paramParser = list.parseListParameters(["id", "date"], ["start_date", "end_date", "medication_id"]);
doses.get("/", auth.authorize("read"), paramParser, list.parseDateFilters, function(req, res, next) {
    // validate and parse filter query parameters
    var rawId = req.listParameters.filters.medication_id;
    if (rawId !== null) {
        // convert from string to int
        var medicationId = ~~Number(rawId); // ~~ truncates fractional parts

        // check ID was a valid number
        if (String(medicationId) !== rawId || medicationId < 0)
            return next(errors.INVALID_RESOURCE_MEDICATION_ID);

        // check med with that ID exists
        var med = req.patient.medications.id(medicationId);
        if (!med) return next(errors.INVALID_RESOURCE_MEDICATION_ID);

        // store parsed med ID
        req.listParameters.filters.medication_id = medicationId;
    }

    next();
}, function(req, res, next) {
    // query medications with those parameters
    req.patient.queryDoses(req.listParameters, req.user, req.patient, returnListData(res, next));
}, formatList);


doses.get("/nonempty/first", auth.authorize("read"), paramParser, list.parseDateFilters, function(req, res, next) {
    // validate and parse filter query parameters
    var rawId = req.listParameters.filters.medication_id;
    if (rawId !== null) {
        // convert from string to int
        var medicationId = ~~Number(rawId); // ~~ truncates fractional parts

        // check ID was a valid number
        if (String(medicationId) !== rawId || medicationId < 0)
            return next(errors.INVALID_RESOURCE_MEDICATION_ID);

        // check med with that ID exists
        var med = req.patient.medications.id(medicationId);
        if (!med) return next(errors.INVALID_RESOURCE_MEDICATION_ID);

        // store parsed med ID
        req.listParameters.filters.medication_id = medicationId;
    }

    next();
}, function(req, res, next) {
    // query medications with those parameters
    req.patient.queryDoses(req.listParameters, req.user, req.patient, returnListData(res, next));
}, formatListFirstMonth);
