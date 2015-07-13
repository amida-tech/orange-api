"use strict";

var async           = require("async"),
    DATE_REGEXP     = require("../helpers/time.js").DATE_ONLY_REGEXP,
    errors          = require("../../errors.js").ERRORS;

// implements core CRUD functionality for Patient: creating, deleting, etc
module.exports = function (PatientSchema) {
    // add access and group fields for a user so the output of this contains all data
    // needed to be directly output over the API
    function formatForUser(user, patient, callback) {
        var share = patient.shareForEmail(user.email);
        if (typeof share === "undefined" || typeof share.access === "undefined") {
            patient.access = "none";
            patient.group = null;
        } else {
            patient.access = share.access;
            patient.group = share.group;
        }

        // if access is default, fill it with the default value
        if (patient.access === "default") patient.access = patient.permissions[patient.group];

        // set access_X keys from permissions.X
        patient.access_prime = patient.permissions.prime;
        patient.access_family = patient.permissions.family;
        patient.access_anyone = patient.permissions.anyone;

        // set name keys in snakecase
        patient.first_name = patient.firstName;
        patient.last_name = patient.lastName;

        // return patient with new data added (for chaining)
        callback(null, patient);
    }

    // create new patient & read/write association with user
    // probably what you want to call to create patients in most cases
    PatientSchema.statics.createForUser = function (data, user, done) {
        // store permissions.X from access_X keys in raw data
        data.permissions = {};
        if (typeof data.access_prime !== "undefined") data.permissions.prime = data.access_prime;
        if (typeof data.access_family !== "undefined") data.permissions.family = data.access_family;
        if (typeof data.access_anyone !== "undefined") data.permissions.anyone = data.access_anyone;

        // camelcase keys
        data.firstName = data.first_name;
        data.lastName = data.last_name;

        // create patient, share with user, and then add top-level access
        // field to output
        async.seq(this.create.bind(this), function (patient, callback) {
            patient.share(user.email, "write", "owner", callback);
        }, async.apply(formatForUser, user))(data, done);
    };

    // find patient by ID, and ensure the passed user has at least the access
    // level desired
    PatientSchema.statics.findByIdForUser = function (id, user, access, callback) {
        var done = function (err, patient) {
            // specifically catch cast errors caused by a patient ID
            if (err && err.name === "CastError" && err.path === "_id") return callback(errors.INVALID_PATIENT_ID);
            callback(err, patient);
        };

        // split query up because we're giving different errors for patient ID
        async.seq(this.findById.bind(this), function (patient, done) {
            // if no patient found, patient ID must have been wrong
            if (!patient) return done(errors.INVALID_PATIENT_ID);

            var authError = patient.authorize(user, access);
            if (authError) return done(authError);
            else return done(null, patient);
        }, async.apply(formatForUser, user))(id, done);
    };

    // find patient by ID, ensure user has write access, and update with the passed data
    PatientSchema.statics.findByIdAndUpdateForUser = function (id, data, user, done) {
        // find patient (verifying access), update patient, and update share if needed
        async.seq(this.findByIdForUser.bind(this), function (patient, callback) {
            // update patient non-sharing data
            if (typeof data.first_name !== "undefined") patient.firstName = data.first_name;
            if (typeof data.last_name !== "undefined") patient.lastName = data.last_name;
            if (typeof data.sex !== "undefined") patient.sex = data.sex;
            if (typeof data.birthdate !== "undefined") patient.birthdate = data.birthdate;
            if (typeof data.access_prime !== "undefined") patient.permissions.prime = data.access_prime;
            if (typeof data.access_family !== "undefined") patient.permissions.family = data.access_family;
            if (typeof data.access_anyone !== "undefined") patient.permissions.anyone = data.access_anyone;

            // remove num from callback for consistency so we can chain callbacks easily
            patient.save(function (err, patient) {
                if (err) return callback(err);
                callback(null, patient);
            });
        }, function (patient, callback) {
            // can do this directly because we check for access="none" in pre save hook of Share
            if (typeof data.access !== "undefined" || typeof data.group !== "undefined")
                return patient.share(user.email, data.access, data.group, callback);

            callback(null, patient);
        }, async.apply(formatForUser, user))(id, user, "write", done);
    };

    // find patient by ID, ensure user has write access, and delete
    PatientSchema.statics.findByIdAndDeleteForUser = function (id, user, done) {
        // find patient (verifying access), delete patient and delete all data belonging to the
        // patient (see delete hooks)
        async.seq(this.findByIdForUser.bind(this), function (patient, callback) {
            patient.remove(callback);
        }, async.apply(formatForUser, user))(id, user, "delete", done);
    };

    // query patients by user: find those the user has at least read access to
    // parameters can contain the parameters detailed in API docs:
    //     limit, offset, sort_by, sort_order, first_name and last_name
    // parameters are *NOT* validated here (but instead in controllers/patients/core.js)
    // limit, offset, sort_by and sort_order must be specified (the controller should
    // set them to sensible defaults if not present)
    // done should be a callback taking *three* parameters: err, results and count
    PatientSchema.statics.findForUser = function (parameters, user, done) {
        // build up the mongo query to execute
        var query = {
            "shares.email": user.email // guarantees the user has at least read access to the patient
        };
        // perform fuzzy matching by comparing double metaphone (better soundex) values
        var keys, firstName = parameters.firstName, lastName = parameters.lastName;
        if (typeof firstName !== "undefined" && firstName !== null && firstName.length !== 0) {
            // require to be any word in _s_first_name
            keys = this.metaphone(firstName);
            if (keys.length > 0) query._s_firstName = { "$in": keys };
        }
        if (typeof lastName !== "undefined" && lastName !== null && lastName.length !== 0) {
            // require to be any word in _s_last_name
            keys = this.metaphone(lastName);
            if (keys.length > 0) query._s_lastName = { "$in": keys };
        }

        // sort patients by the specified field in the specified order
        var sort = {};
        if (parameters.sortBy === "id") parameters.sortBy = "_id";
        else if (parameters.sortBy === "first_name") parameters.sortBy = "firstName";
        else if (parameters.sortBy === "last_name") parameters.sortBy = "lastName";
        sort[parameters.sortBy] = parameters.sortOrder;

        // find patients
        var find = function (callback) {
            this.find(query) // find patients matching query
                .sort(sort) // sort patients
                .skip(parameters.offset) // pagination offset
                .limit(parameters.limit) // pagination limit
                .exec(function (err, patients) {
                    if (err) return callback(err);

                    // apply formatForUser to each patient
                    async.map(patients, async.apply(formatForUser, user), callback);
                });
        }.bind(this);

        // count patients
        var count = function (callback) {
            this.count(query, callback);
        }.bind(this);

        return async.parallel({ data: find, count: count }, function (err, results) {
            if (err) return done(err);
            done(results.find, results.data, results.count);
        });
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

    // store empty last names rather than undefined ones
    // explicitly do this because Patient.create doesn't create defaults from undefined
    // further, we also do this on null values because null values are used to reset fields
    PatientSchema.pre("save", function (next) {
        if (typeof this.lastName === "undefined" || this.lastName === null) this.lastName = "";
        next();
    });
};
