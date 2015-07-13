"use strict";
var express         = require("express"),
    mongoose        = require("mongoose"),
    intersection    = require("array-intersection"),
    crud            = require("./helpers/crud.js"),
    auth            = require("./helpers/auth.js"),
    doctors         = require("./doctors.js"),
    pharmacies      = require("./pharmacies.js"),
    query           = require("./helpers/query.js"),
    errors          = require("../errors.js").ERRORS;

var medications = module.exports = express.Router({ mergeParams: true });

// Helpers to DRY up CRUD controllers: see helpers/crud.js
// Fields we want to output in JSON responses (in addition to ID)
var inputKeys = ["name", "rx_norm", "ndc", "dose", "route", "form", "rx_number", "quantity", "type", "schedule",
    "doctor_id", "pharmacy_id", "doctor", "pharmacy", "fill_date", "access_anyone", "access_family", "access_prime"];
var keys = module.exports.keys = inputKeys.concat(["number_left"]); // output-only fields
var filterInput = crud.filterInputGenerator(inputKeys),
    formatObjectCode = crud.formatObjectGenerator(keys),
    formatObject = formatObjectCode(200),
    formatList = crud.formatListGenerator(keys, "medications"),
    returnData = crud.returnData;

// Usually we just return doctor_id and pharmacy_id fields, but some endpoints use
// this middleware to expand out these into full doctor and pharmacy fields (containing
// their respective objects respectively)
function populateMedication (req, res, next) {
    res.data.expand(req.patient);

    // format doctor for output
    if (res.data.doctor !== null) {
        var output = crud.filter(res.data.doctor.getData(), doctors.keys);
        output.id = res.data.doctor._id;
        res.data.doctor = output;
    }

    // format pharmacy for output
    if (res.data.pharmacy !== null) {
        output = crud.filter(res.data.pharmacy.getData(), pharmacies.keys);
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

// Create a new medication for the specified patient (requires write access)
medications.post("/", auth.authorize("write"), filterInput, function (req, res, next) {
    req.patient.createMedication(req.data, returnData(res, next));
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
medications.get("/", auth.authorize("read"), function (req, res, next) {
    // parse query parameters
    // max number of results to return (for pagination)
    var limit = query.parseNatural(req.query.limit, 25);
    if (limit === null) return next(errors.INVALID_LIMIT);
    // number of results to skip initially (for pagination)
    var offset = query.parseNatural(req.query.offset, 0);
    if (offset === null) return next(errors.INVALID_OFFSET);
    // key to sort by
    var sortBy = query.parseString(req.query.sort_by, ["id", "name"], "id");
    if (sortBy === null) return next(errors.INVALID_SORT_BY);
    // order to sort in
    var sortOrder = query.parseString(req.query.sort_order, ["asc", "desc"], "asc");
    if (sortOrder === null) return next(errors.INVALID_SORT_ORDER);
    // name to sort by
    var name = req.query.name;

    // all data initially
    res.data = req.patient.medications;

    // restrict to medications we have read access to
    res.data = res.data.filter(function (medication) {
        return medication.authorize("read", req.user, req.patient) === null;
    });

    // search data if we need to
    if (typeof name !== "undefined" && name !== null && name.length !== 0) {
        var keys = mongoose.model("Medication").metaphone(name);

        // use stored metaphone values for fuzzy matching
        res.data = res.data.filter(function (medication) {
            return intersection(medication._s_name, keys).length > 0;
        });
    }

    // limit and offset list
    res.count = res.data.length;
    res.data = res.data.slice(offset, limit + offset);

    // sort list
    if (sortBy === "name") {
        // sort by string name
        res.data.sort(function (medicationA, medicationB) {
            return medicationA.name.localeCompare(medicationB.name);
        });
    } else {
        // sort by numeric ID
        res.data.sort(function (medicationA, medicationB) {
            return medicationA.id - medicationB.id;
        });
    }
    if (sortOrder === "desc") res.data.reverse();

    next();
}, formatList);
