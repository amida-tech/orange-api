"use strict";

var async       = require("async"),
    DATE_REGEXP = require("../helpers/time.js").DATE_ONLY_REGEXP,
    errors      = require("../../errors.js").ERRORS;

// implements core CRUD functionality for Patient: creating, deleting, etc
module.exports = function (PatientSchema) {
    // add access and group fields for a user so the output of this contains all data
    // needed to be directly output over the API
    function formatForUser(user, patient, callback) {
        var share = patient.shareForUser(user);
        if (typeof share === "undefined" || typeof share.access === "undefined") {
            patient.access = "none";
            patient.group = null;
        } else {
            patient.access = share.access;
            patient.group = share.group;
        }
        // return patient with new data added (for chaining)
        callback(null, patient);
    }

    // create new patient & read/write association with user
    // probably what you want to call to create patients in most cases
    PatientSchema.statics.createForUser = function (data, user, done) {
        // create patient, share with user, and then add top-level access
        // field to output
        async.seq(this.create.bind(this), function (patient, callback) {
            patient.share(user, "write", "owner", callback);
        }, async.apply(formatForUser, user))(data, done);
    };

    // find patient by ID, and ensure the passed user has at least the access
    // level desired
    PatientSchema.statics.findByIdForUser = function (id, user, access, callback) {
        // verify access is either "write" or "read"
        if (access !== "write" && access !== "read") return callback(errors.INVALID_ACCESS);

        var done = function (err, patient) {
            // specifically catch cast errors caused by a patient ID
            if (err && err.name === "CastError" && err.path === "_id") return callback(errors.INVALID_PATIENT_ID);
            callback(err, patient);
        };

        // split query up because we're giving different errors for patient ID
        async.seq(this.findById.bind(this), function (patient, callback) {
            // if no patient found, patient ID must have been wrong
            if (!patient) return callback(errors.INVALID_PATIENT_ID);

            // check access level
            patient.authorize(user, access, callback);
        }, async.apply(formatForUser, user))(id, done);
    };

    // find patient by ID, ensure user has write access, and update with the passed data
    PatientSchema.statics.findByIdAndUpdateForUser = function (id, data, user, done) {
        // find patient (verifying access), update patient, and update share if needed
        async.seq(this.findByIdForUser.bind(this), function (patient, callback) {
            // update patient non-sharing data
            if (typeof data.name !== "undefined") patient.name = data.name;
            if (typeof data.sex !== "undefined") patient.sex = data.sex;
            if (typeof data.birthdate !== "undefined") patient.birthdate = data.birthdate;

            // remove num from callback for consistency so we can chain callbacks easily
            patient.save(function (err, patient) {
                if (err) return callback(err);
                callback(null, patient);
            });
        }, function (patient, callback) {
            // can do this directly because we check for access="none" in pre save hook of Share
            if (typeof data.access !== "undefined") return patient.share(user, data.access, null, callback);
            callback(null, patient);
        }, async.apply(formatForUser, user))(id, user, "write", done);
    };

    // find patient by ID, ensure user has write access, and delete
    PatientSchema.statics.findByIdAndDeleteForUser = function (id, user, done) {
        // find patient (verifying access), delete patient and delete all data belonging to the
        // patient (see delete hooks)
        async.seq(this.findByIdForUser.bind(this), function (patient, callback) {
            patient.remove(callback);
        }, async.apply(formatForUser, user))(id, user, "write", done);
    };

    // query patients by user: find those the user has at least read access to
    // query can contain the parameters detailed in API docs:
    //     limit, offset, sort_by, sort_order and name
    // TODO: implement query
    PatientSchema.statics.findForUser = function (query, user, done) {
        // filter by finding all patients shared with the user
        var find = async.seq(this.find.bind(this), function (patients, done) {
            // apply formatForUser to each patient
            async.map(patients, async.apply(formatForUser, user), done);
        });
        find({ "shares.user": user._id }, done);
    };

    // check sex is "male", "female", "other" or "unspecified"
    PatientSchema.path("sex").validate(function (value) {
        return ["male", "female", "other", "unspecified"].indexOf(value) >= 0;
    }, "INVALID_SEX");
    // null values should just give "unspecified"
    PatientSchema.pre("validate", function (next) {
        if (this.sex === null) this.sex = "unspecified";
        next();
    });

    // check birthdate is either null or a valid YYYY-MM-DD string
    PatientSchema.path("birthdate").validate(function (value) {
        return (value === null) || (DATE_REGEXP.exec(value));
    }, "INVALID_BIRTHDATE");
};
