"use strict";
var express         = require("express"),
    crud            = require("./helpers/crud.js"),
    list            = require("./helpers/list.js"),
    auth            = require("./helpers/auth.js"),
    doctors         = require("./doctors.js"),
    pharmacies      = require("./pharmacies.js");

var medications = module.exports = express.Router({ mergeParams: true });

// Helpers to DRY up CRUD controllers: see helpers/crud.js
// Fields we want to output in JSON responses (in addition to ID)
var inputKeys = ["name", "status", "rx_norm", "ndc", "dose", "route", "form", "rx_number", "quantity", "type",
                 "schedule", "doctor_id", "pharmacy_id", "doctor", "pharmacy", "fill_date", "access_anyone",
                 "access_family", "access_prime", "brand", "origin", "import_id", "notes"];
var keys = module.exports.keys = inputKeys.concat(["number_left", "schedule_summary"]); // output-only fields
var timesKeys = ["default", "user"];
var filterInput = crud.filterInputGenerator(inputKeys),
    filterTimesInput = crud.filterInputGenerator(timesKeys),
    formatObjectCode = crud.formatObjectGenerator(keys),
    formatObject = formatObjectCode(200),
    formatTimesObject = crud.formatObjectGenerator(timesKeys)(200),
    formatList = crud.formatListGenerator(keys, "medications"),
    returnData = crud.returnData,
    returnListData = crud.returnListData;

// Usually we just return doctor_id and pharmacy_id fields, but some endpoints use
// this middleware to expand out these into full doctor and pharmacy fields (containing
// their respective objects respectively)
function populateMedication (req, res, next) {
    res.data.expand(req.patient);

    // format doctor for output
    if (res.data.doctor !== null) {
        var output = crud.filter(res.data.doctor.getData(req.patient), doctors.keys);
        output.id = res.data.doctor._id;
        res.data.doctor = output;
    }

    // format pharmacy for output
    if (res.data.pharmacy !== null) {
        output = crud.filter(res.data.pharmacy.getData(req.patient), pharmacies.keys);
        output.id = res.data.pharmacy._id;
        res.data.pharmacy = output;
    }

    next();
}

// authorize read-only the user against the patient, and then with the specified access
// level against the medication
function authorize(access) {
    return function (req, res, next) {
        // first authorize read access against the patient
        auth.authorize("read")(req, res, function (err) {
            if (err) return next(err);

            // find medication from params and authenticate
            // TODO: we're making duplicate find calls for every medication endpoint
            req.patient.findMedicationById(req.params.medicationid, function (err, medication) {
                if (err) return next(err);
                next(medication.authorize(access, req.user, req.patient));
            });
        });
    };
}

// View notification time settings
medications.get("/:medicationid/times/:timeid", authorize("read"), function (req, res, next) {
    // find medication
    req.patient.findMedicationById(req.params.medicationid, function (err, medication) {
        if (err) return next(err);

        // find time inside medication schedule
        medication.findNotificationSettings(req.params.timeid, req.user, returnData(res, next));
    });
}, formatTimesObject);

// Update notification time settings
medications.put("/:medicationid/times/:timeid", authorize("write"), filterTimesInput, function (req, res, next) {
    // find medication
    req.patient.findMedicationById(req.params.medicationid, function (err, medication) {
        if (err) return next(err);

        // find time inside medication schedule and update it
        medication.updateNotificationSettings(req.params.timeid, req.user, req.data, returnData(res, next));
    });
}, formatTimesObject);

// Create a new medication for the specified patient (requires write access)
medications.post("/", auth.authorize("write"), filterInput, function (req, res, next) {
    // Merging
    // If a medication is imported, and has an import_id, and a medication with the same import_id
    // already exists, update that medication instead of creating a new one
    if (req.data.origin === "imported" && typeof req.data.import_id === "number") {
        // try and find medication with the same import_id
        var existing = req.patient.medications.filter(function (med) {
            return med.origin === "imported" && med.importId === req.data.import_id;
        })[0];
        if (typeof existing !== "undefined" && existing !== null) {
            // update existing medication
            return req.patient.findMedicationByIdAndUpdate(existing._id, req.data, returnData(res, next));
        }
    }

    // otherwise create new medication, setting the current user as the creator
    req.data.creator = req.user.email;
    return req.patient.createMedication(req.data, returnData(res, next));
}, formatObjectCode(201)); // return 201 status code

// View a single medication for the specified patient
medications.get("/:medicationid", authorize("read"), function (req, res, next) {
    req.patient.findMedicationById(req.params.medicationid, returnData(res, next));
}, populateMedication, formatObject);

// Remove a single medication for the specified patient (requires write access)
medications.delete("/:medicationid", authorize("write"), function (req, res, next) {
    req.patient.findMedicationByIdAndDelete(req.params.medicationid, returnData(res, next));
}, formatObject);

// Update a single medication for the specified patient (requires write access)
medications.put("/:medicationid", authorize("write"), filterInput, function (req, res, next) {
    req.patient.findMedicationByIdAndUpdate(req.params.medicationid, req.data, returnData(res, next));
}, formatObject);

// View a listing of all medications for the specified patient
var paramParser = list.parseListParameters(["id", "name"], ["name"]);
medications.get("/", auth.authorize("read"), paramParser, function (req, res, next) {
    req.patient.queryMedications(req.listParameters, req.user, req.patient, returnListData(res, next));
}, formatList);
