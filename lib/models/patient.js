"use strict";
var mongoose = require("mongoose");
var async = require("async");
// var validator = require("validator");

var errors = require("../errors.js").ERRORS;
var TIME_REGEXP = require("./helpers/time.js").TIME_REGEXP;
var autoIncrementId = require("./helpers/increment_plugin.js");

// schemas to nest of child resources (e.g., doctors, pharmacies)
var DoctorSchema = require("./doctor.js");
var PharmacySchema = require("./pharmacy.js");
var MedicationSchema = require("./medication.js");

/*eslint-disable key-spacing */
var PatientSchema = new mongoose.Schema({
    name:           { type: String, required: true },
    // we heavily rely on the fact that only one share per user per patient exists: mongoose doens't support unique
    // validation, so this is just implemented in the various methods below. beware of directly updating Patients for
    // this reason.
    shares: [{
        user:       { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        access:     { type:   String, enum: ["read", "write"], required: true }
    }],
    // habits
    wake:           { type: String, default: null, match: [TIME_REGEXP, 'Invalid wake time'] },
    sleep:          { type: String, default: null, match: [TIME_REGEXP, 'Invalid sleep time'] },
    breakfast:      { type: String, default: null, match: [TIME_REGEXP, 'Invalid breakfast time'] },
    lunch:          { type: String, default: null, match: [TIME_REGEXP, 'Invalid lunch time'] },
    dinner:         { type: String, default: null, match: [TIME_REGEXP, 'Invalid dinner time'] },
    // child resources
    doctors:        [DoctorSchema],
    pharmacies:     [PharmacySchema],
    medications:    [MedicationSchema]
});
/*eslint-enable key-spacing */

// index this so we can find patients a user has access to in reasonable time without having to
// maintain a duplicate patients array in each User object
PatientSchema.index({
    "shares.user": 1
});

PatientSchema.plugin(autoIncrementId, { slug: "patientId" }); // auto incrementing IDs

// undefined if no shares
PatientSchema.methods.shareForUser = function (user) {
    return this.shares.filter(function (share) {
        // don't use === as objects
        return share.user.equals(user._id);
    })[0];
};

// share patient with a user. if already shared, update access (addToShare
// handles this for us)
PatientSchema.methods.share = function (user, access, callback) {
    var share = this.shareForUser(user);

    // in this case remove the share
    if (access === "none") {
        // if no shares exist already, we're done
        if (typeof share === "undefined") return callback(null, this);
        // otherwise remove
        this.shares.pull(share._id);
    } else if (typeof share !== "undefined") {
        // if a share already exists
        share.access = access;
    } else {
        // otherwise create a new share
        this.shares.addToSet({
            user: user._id,
            access: access
        });
    }

    this.markModified("shares");
    // remove num from callback for consistency so we can chain callbacks easily
    this.save(function (err, patient) {
        if (err) return callback(err);
        callback(null, patient);
    });
};

// check a user is authorized to the given access level on this patient
// callback given patient on success
PatientSchema.methods.authorize = function (user, access, callback) {
    var share = this.shareForUser(user);

    // write access implies read access hence the convoluted cases
    if (typeof share === "undefined") {
        return callback(errors.UNAUTHORIZED);
    } else if (access !== "read" && share.access !== access) {
        return callback(errors.UNAUTHORIZED);
    } else if (access === "read" && share.access !== "read" && share.access !== "write") {
        return callback(errors.UNAUTHORIZED);
    } else {
        return callback(null, this);
    }
};

// add access field
function formatForUser(user, patient, callback) {
    var share = patient.shareForUser(user);
    if (typeof share === "undefined" || typeof share.access === "undefined") {
        patient.access = "none";
    } else {
        patient.access = share.access;
    }
    callback(null, patient);
}

// create new patient & read/write association with user
// probably what you want to call to create patients in most cases
PatientSchema.statics.createForUser = function (data, user, done) {
    // create patient, share with user, and then add top-level access
    // field to output
    async.seq(this.create.bind(this), function (patient, callback) {
        patient.share(user, "write", callback);
    }, async.apply(formatForUser, user))(data, done);
};

// find patient by ID, and ensure the passed user has at least the access
// level desired
PatientSchema.statics.findByIdForUser = function (id, user, access, callback) {
    // verify access is either "write" or "read"
    if (access !== "write" && access !== "read") return callback(errors.INVALID_ACCESS);

    var done = function (err, patient) {
        // specifically catch cast errors caused by a patient ID
        if (err && err.name === 'CastError' && err.path === '_id') return callback(errors.INVALID_PATIENT_ID);
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
        // remove num from callback for consistency so we can chain callbacks easily
        patient.save(function (err, patient) {
            if (err) return callback(err);
            callback(null, patient);
        });
    }, function (patient, callback) {
        // can do this directly because we check for access="none" in pre save hook of Share
        if (typeof data.access !== "undefined") return patient.share(user, data.access, callback);
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

// take a raw input from the API and perform simple validation
// on blank input, returns the default value, and on any other invalid
// input throws the error (to be caught by the error handling middleware)
/*
// check input is numerical, integral and positive
function parseNaturalArgument(value, defaultValue, error) {
    // if not specified
    if (typeof value === "undefined") return defaultValue
    // if a valid natural number
    if (validator.isInt(value, {min: 0})) return value;
    throw error;
}

// check input is one of a list of allowed values
function parseEnumArgument(value, allowedValues, defaultValue, error) {
    // if not specified
    if (typeof value === "undefined") return defaultValue
    // if valid
    if (allowedValues.indexOf(value) >= 0) return value;
    throw error;
}
*/

// query patients by user: find those the user has at least read access to
// query can contain the parameters detailed in API docs:
//     limit, offset, sort_by, sort_order and name
PatientSchema.statics.findForUser = function (query, user, done) {
    /*
    // TODO limit results to 25 by default
    var limit = parseNaturalArgument(query.limit, 2, errors.INVALID_LIMIT);
    // TODO for pagination: mongo skip is a slow but necessary evil here
    var offset = parseNaturalArgument(query.offset, 0, errors.INVALID_OFFSET);
    // TODO sorting
    var sortBy = parseEnumArgument(query.sortBy, ["id", "name"], "id", errors.INVALID_SORT_BY);
    var sortOrder = parseEnumArgument(query.sortOrder, ["asc", "desc"], "asc", errors.INVALID_SORT_ORDER);

    // TODO filter by name
    */

    // filter by finding all patients shared with the user
    var find = async.seq(this.find.bind(this), function (patients, done) {
        async.map(patients, async.apply(formatForUser, user), done);
    });
    find({
        "shares.user": user._id
    }, done);
};

// create child resources
// don't actually store anything in these models (instead use children collections on the patient),
// but instead use for validation
var Pharmacy = mongoose.model("Pharmacy", PharmacySchema);
var Doctor = mongoose.model("Doctor", DoctorSchema);
var Medication = mongoose.model("Medication", MedicationSchema);
function createResource (collectionName, model) {
    return function (data, done) {
        var resource = new model(data);
        resource.getId(function (err, resource) {
            if (err) return done(err);
            resource.validate(function (err) {
                if (err) return done(err);
                this[collectionName].push(resource);
                this.markModified(collectionName);
                this.save(function (err, patient) {
                    // return this not resource, because this will have had pre save hooks run
                    if (err) return done(err);
                    findResourceById(collectionName).bind(patient)(resource._id, done);
                }.bind(this));
            }.bind(this));
        }.bind(this));
    };
};
PatientSchema.methods.createDoctor = createResource('doctors', Doctor);
PatientSchema.methods.createPharmacy = createResource('pharmacies', Pharmacy);
PatientSchema.methods.createMedication = createResource('medications', Medication);

// view child resources
function findResourceById (collectionName, invalidResourceId) {
    var collectionId = collectionName + "._id";
    return function (id, done) {
        var resource = this[collectionName].id(id);
        // no resource found
        if (!resource) return done(invalidResourceId);
        done(null, resource);
    };
};
PatientSchema.methods.findDoctorById = findResourceById('doctors', errors.INVALID_DOCTOR_ID);
PatientSchema.methods.findPharmacyById = findResourceById('pharmacies', errors.INVALID_PHARMACY_ID);
PatientSchema.methods.findMedicationById = findResourceById('medications', errors.INVALID_MEDICATION_ID);

// remove child resources
function findResourceByIdAndDelete (collectionName, invalidResourceId) {
    return function (id, done) {
        findResourceById(collectionName, invalidResourceId).bind(this)(id, function (err, resource) {
            if (err) return done(err);
            resource.remove();
            this.save(function (err, patient) {
                if (err) return done(err);
                done(null, resource);
            }.bind(this));
        }.bind(this));
    };
};
PatientSchema.methods.findDoctorByIdAndDelete = findResourceByIdAndDelete("doctors", errors.INVALID_DOCTOR_ID);
PatientSchema.methods.findPharmacyByIdAndDelete = findResourceByIdAndDelete("pharmacies", errors.INVALID_PHARMACY_ID);
PatientSchema.methods.findMedicationByIdAndDelete = findResourceByIdAndDelete("medications", errors.INVALID_MEDICATION_ID);

// update child resources
function findResourceByIdAndUpdate (collectionName, invalidResourceId) {
    return function (id, data, done) {
        findResourceById(collectionName, invalidResourceId).bind(this)(id, function (err, resource) {
            if (err) return done(err);

            var err = resource.setData(data);
            if (err) return done(err);
            resource.save(function (err) {
                if (err) return done(err);
                done(null, resource);
            });
        }.bind(this));
    };
};
PatientSchema.methods.findDoctorByIdAndUpdate = findResourceByIdAndUpdate("doctors", errors.INVALID_DOCTOR_ID);
PatientSchema.methods.findPharmacyByIdAndUpdate = findResourceByIdAndUpdate("pharmacies", errors.INVALID_PHARMACY_ID);
PatientSchema.methods.findMedicationByIdAndUpdate = findResourceByIdAndUpdate("medications", errors.INVALID_MEDICATION_ID);

PatientSchema.virtual("habits").get(function () {
    return {
        wake: this.wake,
        sleep: this.sleep,
        breakfast: this.breakfast,
        lunch: this.lunch,
        dinner: this.dinner
    };
}).set(function (habits) {
    // Upate the habits of a patient from an object containing them, ignoring any undefined
    // values but storing any blank values
    if (typeof habits.wake !== "undefined") this.wake = habits.wake;
    if (typeof habits.sleep !== "undefined") this.sleep = habits.sleep;
    if (typeof habits.breakfast !== "undefined") this.breakfast = habits.breakfast;
    if (typeof habits.lunch !== "undefined") this.lunch = habits.lunch;
    if (typeof habits.dinner !== "undefined") this.dinner = habits.dinner;
});
// update and save
PatientSchema.methods.updateHabits = function (habits, callback) {
    this.habits = habits;
    this.save(callback);
};

module.exports = mongoose.model("Patient", PatientSchema);
