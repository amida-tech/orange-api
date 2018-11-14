"use strict";
var mongoose          = require("mongoose"),
      errors          = require("../errors.js").ERRORS,
      fuzzy           = require("./helpers/fuzzy_plugin.js"),
      autoIncrementId = require("./helpers/increment_plugin.js");

/*eslint-disable key-spacing */
// a schema to be nested inside a Patient representing their document signaturess
var DocumentSignatureSchema = module.exports = new mongoose.Schema({
    _id:            { type: Number, required: true, index: true },
    documentName:      { type: String, required: true },
    version:       { type: String, required: true },
    dateSigned:       { type: String, required: true }
});
/*eslint-enable key-spacing */

DocumentSignatureSchema.plugin(autoIncrementId, { slug: "documentSignatureId" }); // auto incrementing IDs

DocumentSignatureSchema.plugin(fuzzy, { fields: ["documentName"] });

// given a raw data object, update ourselves with it
// note we don't call save here
DocumentSignatureSchema.methods.setData = function (data) {
    if (typeof data.documentName !== "undefined") this.documentName = data.documentName;
    if (typeof data.version !== "undefined") this.version = data.version;
    this.dateSigned = new Date().toISOString();
};

// output documentSignature for API
DocumentSignatureSchema.methods.getData = function () {
    return {
        _id: this._id,
        documentName: this.documentName,
        version: this.version,
        dateSigned: this.dateSigned
    };
};

DocumentSignatureSchema.methods.authorize = function (access, user, patient) {
    // access must be either read of write
    if (access !== "write" && access !== "read") return errors.INVALID_ACCESS;

    // clinicians get full read access
    if (user.role === "clinician" && access === "read") return null;

    // find the share between the user and patient
    var share = patient.shareForEmail(user.email);
    if (typeof share === "undefined" || share === null) return errors.UNAUTHORIZED;

    // owner always has permission
    if (share.group === "owner") return null;

    if (share.group === "family") {
        if (access === "read") return null;
        return errors.UNAUTHORIZED;
    } else if (share.group === "anyone") {
        if (access === "read") return null;
        return errors.UNAUTHORIZED;
    } else {
        return errors.UNAUTHORIZED;
    }
};
