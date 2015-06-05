"use strict";
var mongoose = require('mongoose');
var autoIncrement = require('mongoose-auto-increment');
var async = require('async');
var validator = require('validator');

var errors = require('../errors.js').ERRORS;

var PatientSchema = new mongoose.Schema({
    name:       { type: String, required: true },
    // we heavily rely on the fact that only one share per user per patient exists: mongoose doens't support unique
    // validation, so this is just implemented in the various methods below. beware of directly updating Patients for
    // this reason.
    shares:     [
        {
            user:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
            access: { type: String, enum: ['read', 'write'], required: true }
        }
    ]
});
PatientSchema.plugin(autoIncrement.plugin, 'Patient'); // simple numeric IDs
// index this so we can find patients a user has access to in reasonable time without having to
// maintain a duplicate patients array in each User object
PatientSchema.index({ 'shares.user': 1 });

// TODO for other data types
// remove all patient data when removing patient
/*
PatientSchema.pre('remove', function (next, done) {
    async.parallel([
        function (callback) { mongoose.model('Share').remove({patient: this._id}, callback); }.bind(this)
    ], done); 
    next();
});
*/

// undefined if no shares
PatientSchema.methods.shareForUser = function (user) {
    return this.shares.filter(function (share) {
        // don't use === as objects
        return share.user.equals(user._id);
    })[0];
}

// share patient with a user. if already shared, update access (addToShare
// handles this for us)
PatientSchema.methods.share = function (user, access, callback) {
    var share = this.shareForUser(user);

    // in this case remove the share
    if (access === 'none') {
        // if no shares exist already, we're done
        if (typeof share === 'undefined') return callback(null, patient);
        // otherwise remove
        this.shares.pull(share._id);
    } else if (typeof share !== 'undefined') {
        // if a share already exists
        share.access = access;
    } else {
        // otherwise create a new share
        this.shares.addToSet({ user: user._id, access: access});
    }

    this.markModified('shares');
    // remove num from callback for consistency so we can chain callbacks easily
    this.save(function (err, patient) {
        if (err) return callback(err);
        callback(null, patient);
    });
}

// check a user is authorized to the given access level on this patient
// callback given patient on success
PatientSchema.methods.authorize = function (user, access, callback) {
    var share = this.shareForUser(user);

    // write access implies read access hence the convoluted cases
    if (typeof share === 'undefined') {
        return callback(errors.UNAUTHORIZED);
    } else if (access !== 'read' && share.access !== access) {
        return callback(errors.UNAUTHORIZED);
    } else if (access === 'read' && share.access !== 'read' && share.access !== 'write') {
        return callback(errors.UNAUTHORIZED);
    } else {
        return callback(null, this);
    }
}

// add access field
function formatForUser(user, patient, callback) {
    var share = patient.shareForUser(user);
    if (typeof share === 'undefined' || typeof share.access === 'undefined') {
        patient.access = 'none';
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
        patient.share(user, 'write', callback);
    }, async.apply(formatForUser, user))(data, done);
}

// find patient by ID, and ensure the passed user has at least the access
// level desired
PatientSchema.statics.findByIdForUser = function (id, user, access, done) {
    // verify access is either "write" or "read"
    if (access !== "write" && access !== "read") return done(errors.INVALID_ACCESS);

    // split query up because we're giving different errors for patient ID
    async.seq(this.findById.bind(this), function (patient, callback) {
        // if no patient found, patient ID must have been wrong
        if (!patient) return callback(errors.INVALID_PATIENT_ID);

        // check access level
        patient.authorize(user, access, callback);
    }, async.apply(formatForUser, user))(id, done);
}

// find patient by ID, ensure user has write access, and update with the passed data
PatientSchema.statics.findByIdAndUpdateForUser = function (id, data, user, done) {
    // find patient (verifying access), update patient, and update share if needed
    async.seq(this.findByIdForUser.bind(this), function (patient, callback) {
        // update patient non-sharing data
        if (typeof data.name !== 'undefined') patient.name = data.name;
        // remove num from callback for consistency so we can chain callbacks easily
        patient.save(function (err, patient) {
            if (err) return callback(err);
            callback(null, patient);
        });
    }, function (patient, callback) {
        // can do this directly because we check for access="none" in pre save hook of Share
        if (typeof data.access !== 'undefined') return patient.share(user, data.access, callback);
        callback(null, patient);
    }, async.apply(formatForUser, user))(id, user, 'write', done);
}

// find patient by ID, ensure user has write access, and delete
PatientSchema.statics.findByIdAndDeleteForUser = function (id, user, done) {
    // find patient (verifying access), delete patient and delete all data belonging to the
    // patient (see delete hooks)
    async.seq(this.findByIdForUser.bind(this), function (patient, callback) {
        patient.remove(callback);
    }, async.apply(formatForUser, user))(id, user, 'write', done);
}

// take a raw input from the API and perform simple validation
// on blank input, returns the default value, and on any other invalid
// input throws the error (to be caught by the error handling middleware)

// check input is numerical, integral and positive
function parseNaturalArgument(value, defaultValue, error) {
    // if not specified
    if (typeof value === 'undefined') return defaultValue
    // if a valid natural number
    if (validator.isInt(value, {min: 0})) return value;
    throw error;
}

// check input is one of a list of allowed values
function parseEnumArgument(value, allowedValues, defaultValue, error) {
    // if not specified
    if (typeof value === 'undefined') return defaultValue
    // if valid
    if (allowedValues.indexOf(value) >= 0) return value;
    throw error;
}

// query patients by user: find those the user has at least read access to
// query can contain the parameters detailed in API docs:
//     limit, offset, sort_by, sort_order and name
PatientSchema.statics.findForUser = function (query, user, done) {
    // TODO limit results to 25 by default
    var limit = parseNaturalArgument(query.limit, 2, errors.INVALID_LIMIT);
    // TODO for pagination: mongo skip is a slow but necessary evil here
    var offset = parseNaturalArgument(query.offset, 0, errors.INVALID_OFFSET);
    // TODO sorting
    var sortBy = parseEnumArgument(query.sortBy, ['id', 'name'], 'id', errors.INVALID_SORT_BY);
    var sortOrder = parseEnumArgument(query.sortOrder, ['asc', 'desc'], 'asc', errors.INVALID_SORT_ORDER);

    // TODO filter by name

    // filter by finding all patients shared with the user
    var find = async.seq(this.find.bind(this), function (patients, done) {
        async.map(patients, async.apply(formatForUser, user), done);
    });
    find({
        'shares.user': user._id
    }, done);
}

var Patient = module.exports = mongoose.model('Patient', PatientSchema);
