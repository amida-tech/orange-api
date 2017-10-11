"use strict";

var mongoose        = require("mongoose"),
    errors          = require("../../errors.js").ERRORS,
    passportAuth    = require("./passport"),
    passport        = require("passport");

var User = mongoose.model("User");

// Authentication middlewares

// Ensures a user is logged in and saves their User object into req.user
// Should be called in all non-user-registration API requests
module.exports.authenticate = function authenticate(req, res, next) {
    passport.authenticate("jwt", { session: false }, function(err, user, info) {
      if (err) { return next(err); }
      next();
    })(req, res, next);
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
