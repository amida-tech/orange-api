"use strict";
var express     = require("express"),
    async       = require("async"),
    mongoose    = require("mongoose"),
    crud        = require("./helpers/crud.js"),
    list        = require("./helpers/list.js"),
    auth        = require("./helpers/auth.js"),
    doctors     = require("./doctors.js"),
    pharmacies  = require("./pharmacies.js"),
    medications = require("./medications.js"),
    listQuery   = require("../models/helpers/list.js").query;

var Patient = mongoose.model("Patient");
var Medication = mongoose.model("Medication");

var router = module.exports = express.Router({
    mergeParams: true
});

// Helpers to DRY up CRUD controllers: see helpers/crud.js
var formatList = crud.formatListGenerator(medications.keys, "medications"),
    returnListData = crud.returnListData;

// View a listing of all medications for all patients the user has access to
var paramParser = list.parseListParameters(["id", "name"], ["name"]);
router.get("/", paramParser, function(req, res, next) {
    // find all patients the user has access to
    Patient.findForUser({}, req.user, function (err, patients) {
        if (err) return next(err);

        // map over all user's patients, find all their medications the user has access to
        //and concatenate the results
        var medications = patients.reduce(function (meds, patient) {
            return meds.concat(patient.medications.filter(function (medication) {
                // authorize
                return medication.authorize("read", req.user, patient) === null;
            }));
        }, []);

        // filter, sort and limit medication list by parameters sent
        // patient is not one fixed value, but we don't need to pass it to list.query as it's only
        // sent to a default filter, which we're not specifying here (default filters are normally
        // used to list an individual patient's medication: they filter to only show medications the
        // user has access to, but we're doing that manully above)
        // see lib/models/patient/resources.js
        return listQuery(medications, req.listParameters, Medication, {}, {}, req.user, null, returnListData(res, next));
    });
}, formatList);
