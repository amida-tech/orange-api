"use strict";
var express = require("express"),
    crud    = require("./helpers/crud.js"),
    errors  = require("../errors.js").ERRORS,
    auth    = require("./helpers/auth.js");

var doses = module.exports = express.Router({ mergeParams: true });

// Helpers to DRY up CRUD controllers: see helpers/crud.js
// Fields we want to output in JSON responses (in addition to ID)
var keys = ["medication_id", "date", "notes", "medication"];
var filterInput = crud.filterInputGenerator(keys),
    formatObjectCode = crud.formatObjectGenerator(keys),
    formatObject = formatObjectCode(200),
    formatList = crud.formatListGenerator(keys, "doses"),
    returnData = crud.returnData;

// Usually we just return medication_id, but when viewing a specific
// journal entry we expand this out to medication
function populateEntry (req, res, next) {
    // TODO: filter keys on this, and expand out pharmacy and doctor
    // as subfields as well
    res.data.expand(req.patient);
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
                    medication.authorize(access, req.user, req.patient, next);
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

            medication.authorize(access, req.user, req.patient, next);
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
    returnData(res, next)(null, req.patient.doses);
}, formatList);
