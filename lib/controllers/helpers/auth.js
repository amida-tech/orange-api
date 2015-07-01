"use strict";

var mongoose    = require("mongoose"),
    errors      = require("../../errors.js").ERRORS;

var User = mongoose.model("User");

// Authentication middlewares

// Ensures a user is logged in and saves their User object into req.user
// Should be called in all non-user-registration API requests
module.exports.authenticate = function authenticate(req, res, next) {
    var auth = req.headers.authorization;

    // must be of the form "Bearer xxx" where xxx is a (variable-length)
    // access token
    if (typeof auth === "undefined" || auth.indexOf("Bearer") !== 0) {
        return next(errors.ACCESS_TOKEN_REQUIRED);
    }

    // Remove "Bearer " from start of auth
    var accessToken = auth.slice(7);

    // find user and store in request
    User.authenticateFromAccessToken(accessToken, function (err, user) {
        if (err) return next(err);

        req.user = user;
        // proceed to handle request as normal
        next();
    });
};

// find patient from patient ID, and ensure they have the access level
// specified. note: this should **not** be used to authorize users for resources
// involving medications as those have extended access permissions
// note that if a user has any access to a patient they must have
// read access so we can use that as a "base" access level to search from
module.exports.authorize = function (access) {
    return function (req, res, next) {
        // find patient
        mongoose.model("Patient").findByIdForUser(req.params.patientid, req.user, access, function (err, patient) {
            if (err) {
                // specifically catch cast errors caused by an invalid patient ID
                if (err.name === "CastError" && err.path === "_id") return next(errors.INVALID_PATIENT_ID);
                return next(err);
            }

            // save patient and handle request as normal
            req.patient = patient;
            next();
        });
    };
};

/*
// find patient and access level from patient ID
// we *don't* check the access level here as we require write/read access
// at various different places (we do require read access however)
// should be called in API requests operating on a specific patient (most)
module.exports.findPatient = function (req, res, next) {
    mongoose.model("Patient").findByIdForUser(req.params.patientid, req.user, "read", function (err, patient) {
        if (err) {
            // specifically catch cast errors caused by an invalid patient ID
            if (err.name === "CastError" && err.path === "_id") return next(errors.INVALID_PATIENT_ID);
            return next(err);
        }

        // save patient and handle request as normal
        req.patient = patient;
        next();
    });
};

// ensure the current user has write access (rather than any access as in findPatient)
// to the currentPatient (must be called _after_ findPatient or something else has populated
// req.patient);
// should be called in API requests operating on a specific patient requiring write access (so
// performing creations/updates/deletes/etc)
module.exports.requireWrite = function (req, res, next) {
    if (req.patient.access !== "write") return next(errors.UNAUTHORIZED);
    next();
};
*/
