"use strict";

var mongoose    = require("mongoose"),
    errors      = require("../../errors.js").ERRORS;

module.exports = function (PatientSchema) {
    // index this so we can find patients a user has access to in reasonable time without having to
    // maintain a duplicate patients array in each User object
    PatientSchema.index({
        "shares.user": 1
    });

    // returns the share corresponding to a specific user
    // returns undefined if no shares with that user
    PatientSchema.methods.shareForEmail = function (email) {
        return this.shares.filter(function (share) {
            return share.email === email;
        })[0];
    };

    // share patient with a user, updating an existing Share if one exists
    // setting access to "none" will remove the share
    PatientSchema.methods.share = function (email, access, group, callback) {
        var share = this.shareForEmail(email);

        // in this case remove the share
        if (access === "none") {
            // if no shares exist already, we're done
            if (typeof share === "undefined") return callback(null, this);
            // otherwise remove
            this.shares.pull(share._id);
        } else if (typeof share !== "undefined") {
            // if a share already exists, update it
            share.access = access;
            share.group = group;
        } else {
            // otherwise create a new share
            this.shares.addToSet({
                email: email,
                group: group,
                access: access
            });
        }

        this.markModified("shares");
        // remove num (third parameter) from callback for consistency so we can chain callbacks easily
        this.save(function (err, patient) {
            if (err) return callback(err);
            callback(null, patient);
        });
    };

    // check a user is authorized to the given access level on this patient for
    // a generic resource (the patient itself, doctors, pharmacies, etc - everything
    // that isn't a medication and doesn't reference a medication)
    PatientSchema.methods.authorizeResource = function (user, access, callback) {
        // access should be read or write
        if (access !== "write" && access !== "read") return callback(errors.INVALID_ACCESS);

        // patients need a share to be authorized
        var share = this.shareForEmail(user.email);
        if (typeof share === "undefined" || share === null) return callback(errors.UNAUTHORIZED);

        // the owner can do anything
        if (share.group === "owner") return callback(null, this);

        // in this non-medication context, all users the patient is shared with can read
        // all of its resources
        if (access === "read") return callback(null, this);

        // otherwise we know write access is being requested.
        // if the share explicitly specifies an access level we can look to that
        if (share.access === "read") return callback(errors.UNAUTHORIZED);
        if (share.access === "write") return callback(null, this);

        // otherwise we have to fallback to the patient-wide permissions
        if (this.permissions[share.group] === "write") return callback(null, this);
        else return callback(errors.UNAUTHORIZED);
    };

    // check a user is authorized to the given access level to modify the patient
    // (as opposed to nested resources). accepts "read", "write" and "delete" (requires
    // the user be the owner of the patient: used when deleting)
    PatientSchema.methods.authorize = function (user, access, callback) {
        if (access === "delete") {
            // if we're requiring the user to own the patient
            var share = this.shareForEmail(user.email);
            if (typeof share === "undefined" || share === null || share.group !== "owner")
                return callback(errors.UNAUTHORIZED);
            else
                return callback(null, this);
        } else {
            // if access is read/write delegate to authorizeResource
            return this.authorizeResource(user, access, callback);
        }
    };
};
