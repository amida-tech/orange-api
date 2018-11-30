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
    PatientSchema.methods.shareForEmail = function (email) {
        return this.shares.filter(function (share) {
            return share.email === email;
        })[0];
    };

    // share patient with a user, updating an existing Share if one exists
    // setting access to "none" will remove the share
    PatientSchema.methods.share = function (email, access, group, callback) {
        var share = this.shareForEmail(email);

        // don't let a non-owner change their group to owner
        if (group === "owner" && typeof share !== "undefined" && share.group !== "owner")
            return callback(errors.INVALID_GROUP);

        // in this case remove the share
        if (access === "none") {
            // if no shares exist already, we're done
            if (typeof share === "undefined") return callback(null, this);

            // otherwise don't let the owner do this
            if (share.group === "owner") return callback(errors.IS_OWNER);

            // otherwise remove
            this.shares.id(share._id).remove();
        } else if (typeof share !== "undefined") {
            // if a share already exists
            // if user is the owner, they shouldn't be able to change anything
            var isOwner = (share.group === "owner");
            var changingGroup = (typeof group !== "undefined" && group !== "owner");
            var changingAccess = (typeof access !== "undefined" && access !== "default" && access !== "write");
            if (isOwner && (changingGroup || changingAccess)) return callback(errors.IS_OWNER);
            // if a share already exists, update it
            if (typeof access !== "undefined") share.access = access;
            if (typeof group !== "undefined") share.group = group;
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
    // create a share and return the share, rather than the patient
    PatientSchema.methods.createShare = function (email, access, group, callback) {
        this.share(email, access, group, function (err) {
            if (err) return callback(err);
            callback(null, this.shareForEmail(email));
        }.bind(this));
    };

    // remove a share with the given shareId
    PatientSchema.methods.removeShare = function (user, shareId, callback) {
        // find share
        var share = this.shares.id(shareId);
        // share must exist
        if (typeof share === "undefined" || share === null) return callback(errors.INVALID_SHARE_ID);

        // share cannot be owner share
        if (share.group === "owner") return callback(errors.IS_OWNER);

        // if user is not owner
        if (user.email !== this.creator) {
            // cannot remove other users' access
            if (user.email !== share.email) return callback(errors.UNAUTHORIZED);
        }

        // then remove it
        share.remove();

        // save and return share
        this.markModified("shares");
        this.save(function (err) {
            if (err) return callback(err);
            callback(null, share);
        });
    };

    // update a share with the given shareId with the given modifications
    PatientSchema.methods.updateShare = function (shareId, modifications, callback) {
        var access = modifications.access;
        var group = modifications.group;

        // find share
        var share = this.shares.id(shareId);
        if (typeof share === "undefined" || share === null) return callback(errors.INVALID_SHARE_ID);

        // owner share cannot be changed
        var isOwner = (share.group === "owner");
        var changingGroup = (typeof group !== "undefined" && group !== "owner");
        var changingAccess = (typeof access !== "undefined" && access !== "default" && access !== "write");
        if (isOwner && (changingGroup || changingAccess)) return callback(errors.IS_OWNER);

        // group cannot be changed to owner
        if (group === "owner") return callback(errors.INVALID_GROUP);

        // update access and group
        if (typeof access !== "undefined") share.access = access;
        if (typeof group !== "undefined") share.group = group;

        // save and return share
        this.markModified("shares");
        this.save(function (err) {
            if (err) return callback(err);
            callback(null, share);
        });
    };

    // check a user is authorized to the given access level on this patient for
    // a generic resource (the patient itself, doctors, pharmacies, etc - everything
    // that isn't a medication and doesn't reference a medication)
    PatientSchema.methods.authorizeResource = function (user, access) {
        // access should be read or write
        if (access !== "write" && access !== "read") return errors.INVALID_ACCESS;

        // clinicians get read-only access to all patients
        if (user.role === "clinician" && access === "read") return null;

        // patients need a share to be authorized
        var share = this.shareForEmail(user.email);
        if (typeof share === "undefined" || share === null) return errors.UNAUTHORIZED;

        // the owner can do anything
        if (share.group === "owner") return null;

        // in this non-medication context, all users the patient is shared with can read
        // all of its resources
        if (access === "read") return null;

        // otherwise we know write access is being requested.
        // if the share explicitly specifies an access level we can look to that
        if (share.access === "read") return errors.UNAUTHORIZED;
        if (share.access === "write") return null;

        // otherwise we have to fallback to the patient-wide permissions
        if (this.permissions[share.group] === "write") return null;
        else return errors.UNAUTHORIZED;
    };

    // check a user is authorized to the given access level to modify the patient
    // (as opposed to nested resources). accepts "read", "write" and "delete" (requires
    // the user be the owner of the patient: used when deleting)
    PatientSchema.methods.authorize = function (user, access) {
        if (access === "delete") {
            // if we're requiring the user to own the patient
            var share = this.shareForEmail(user.email);
            if (typeof share === "undefined" || share === null || share.group !== "owner")
                return errors.UNAUTHORIZED;
            else
                return null;
        } else if (user.role === "programAdministrator") {
            return null;
        } else {
            // if access is read/write delegate to authorizeResource
            return this.authorizeResource(user, access);
        }
    };
};
