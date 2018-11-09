"use strict";
var mongoose          = require("mongoose"),
      fuzzy           = require("./helpers/fuzzy_plugin.js"),
      autoIncrementId = require("./helpers/increment_plugin.js");

/*eslint-disable key-spacing */
// a schema to be nested inside a Patient representing their emergency contactss
var EmergencyContactSchema = module.exports = new mongoose.Schema({
    _id:            { type: Number, required: true, index: true },
    firstName:      { type: String, required: true },
    lastName:       { type: String, required: true },
    relation:       { type: String, required: true },
    // sensible defaults for optional keys so we don't return nulls through
    // the API or leave keys undefined
    primaryPhone:             { type: String, default: "" },
    primaryPhoneProtocols:    [{type: String, enum: ['VOICE', 'SMS', 'TTY']}],
    secondaryPhone:           { type: String, default: "" },
    secondaryPhoneProtocols:  [{type: String, enum: ['VOICE', 'SMS', 'TTY']}],
    email:                    { type: String, default: "" }
});
/*eslint-enable key-spacing */

EmergencyContactSchema.plugin(autoIncrementId, { slug: "emergencyContactId" }); // auto incrementing IDs

EmergencyContactSchema.plugin(fuzzy, { fields: ["firstName", "lastName"] });

// given a raw data object, update ourselves with it
// note we don't call save here
EmergencyContactSchema.methods.setData = function (data) {
    if (typeof data.firstName !== "undefined") this.firstName = data.firstName;
    if (typeof data.lastName !== "undefined") this.lastName = data.lastName;
    if (typeof data.relation !== "undefined") this.relation = data.relation;
    if (typeof data.primaryPhone !== "undefined") this.primaryPhone = data.primaryPhone;
    if (typeof data.primaryPhoneProtocols !== "undefined") this.primaryPhoneProtocols = data.primaryPhoneProtocols;
    if (typeof data.secondaryPhone !== "undefined") this.secondaryPhone = data.secondaryPhone;
    if (typeof data.secondaryPhoneProtocols !== "undefined") this.secondaryPhoneProtocols = data.secondaryPhoneProtocols;
    if (typeof data.email !== "undefined") this.email = data.email;
};

// output emergencyContact for API
EmergencyContactSchema.methods.getData = function () {
    return {
        _id: this._id,
        firstName: this.firstName,
        lastName: this.lastName,
        relation: this.relation,
        primaryPhone: this.primaryPhone,
        primaryPhoneProtocols: this.primaryPhoneProtocols,
        secondaryPhone: this.secondaryPhone,
        secondaryPhoneProtocols: this.secondaryPhoneProtocols,
        email: this.email
    };
};

// use null values to reset optional fields
EmergencyContactSchema.pre("save", function (next) {
    if (this.primaryPhone === null) this.primaryPhone = "";
    if (this.primaryPhoneProtocols === null) this.primaryPhoneProtocols = [];
    if (this.secondaryPhone === null) this.secondaryPhone = "";
    if (this.secondaryPhoneProtocols === null) this.secondaryPhoneProtocols = [];
    if (this.email === null) this.email = "";
    next();
});


EmergencyContactSchema.methods.authorize = function (access, user, patient) {
    // access must be either read of write
    if (access !== "write" && access !== "read") return errors.INVALID_ACCESS;

    // clinicians get full read access
    if (user.role === "clinician" && access === "read") return null;

    // find the share between the user and patient
    var share = patient.shareForEmail(user.email);
    if (typeof share === "undefined" || share === null) return errors.UNAUTHORIZED;

    // owner always has permission
    if (share.group === "owner") return null;

    // likewise the user that created the medication always has access
    if (typeof this.creator === "string" && this.creator.length > 0 && this.creator === user.email) return null;

    // otherwise medicationAccess should be 'default' so:
    //  - default for family:
    //      - if as_needed then write
    //      - else read
    //  - deafult for anyone:
    //      - read
    //  - default for prime: delegate to patient
    if (share.group === "family") {
        return null;
    } else if (share.group === "anyone") {
        if (access === "read") return null;
        return errors.UNAUTHORIZED;
    } else {
        return patient.authorize(user, access);
    }
};
