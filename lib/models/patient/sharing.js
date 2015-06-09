"use strict";

var errors = require("../../errors.js").ERRORS;

module.exports = function (PatientSchema) {
    // index this so we can find patients a user has access to in reasonable time without having to
    // maintain a duplicate patients array in each User object
    PatientSchema.index({
        "shares.user": 1
    });

    // returns the share corresponding to a specific user
    // returns undefined if no shares with that user
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
        // remove num (third parameter) from callback for consistency so we can chain callbacks easily
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
        if (typeof share === "undefined")
            return callback(errors.UNAUTHORIZED);
        else if (access !== "read" && share.access !== access)
            return callback(errors.UNAUTHORIZED);
        else if (access === "read" && share.access !== "read" && share.access !== "write")
            return callback(errors.UNAUTHORIZED);
        else
            return callback(null, this);
    };
};
