"use strict";

var mongoose = require("mongoose");
var errors = require("../../errors.js").ERRORS;

// find patient and access level from patient ID
// we *don't* check the access level here as we require write/read access
// at various different places (we do require read access however)
module.exports = function (req, res, next) {
    mongoose.model("Patient").findByIdForUser(req.params.patientid, req.user, "read", function (err, patient) {
        if (err) {
            // specifically catch cast errors caused by a patient ID
            if (err.name === 'CastError' && err.path === '_id') return next(errors.INVALID_PATIENT_ID);
            return next(err);
        }

        // save patient and handle request as normal
        req.patient = patient;
        next();
    });
};
