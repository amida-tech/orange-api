"use strict";
var mongoose = require("mongoose");

// regular expression to validate HH:MM times
var TIME_REGEXP     = require("../helpers/time.js").TIME_REGEXP,
    autoIncrementId = require("../helpers/increment_plugin.js"),
    fuzzy           = require("../helpers/fuzzy_plugin.js");

// schemas to nest of child resources (e.g., doctors, pharmacies)
var DoctorSchema        = require("../doctor.js"),
    PharmacySchema      = require("../pharmacy.js"),
    MedicationSchema    = require("../medication.js"),
    JournalEntrySchema  = require("../journal_entry.js"),
    DoseSchema          = require("../dose.js"),
    ShareSchema         = require("../share.js");

// getter functions to get the gridfs and zerorpc clients passed in
module.exports = function (gfs, zrpc) {
    /*eslint-disable key-spacing */
    var PatientSchema = new mongoose.Schema({
        firstName:      { type: String, required: true },
        lastName:       { type: String, default: "" },
        birthdate:      { type: String, default: null },
        sex:            { type: String, default: "unspecified" },
        phone:          { type: String, default: "" },
        creator:        { type: String, required: true },
        // file extension and mime type of patient avatar (used in URLs and for Content-Type header)
        avatarType:     {
            ext:        { type: String, default: "png" }, // file extension
            mime:       { type: String, default: "image/png" } // mime type
        },
        // we heavily rely on the fact that only one share per user per patient exists: mongoose doens't support unique
        // validation, so this is just implemented in the various methods below. beware of directly updating Patients
        // for this reason
        shares: [ShareSchema],
        // the default access levels of the 4 different groups of shared users
        permissions: {
            anyone:     {
                type: String,
                enum: {
                    values: ["read", "write"],
                    message: "INVALID_ACCESS_ANYONE"
                },
                required: "INVALID_ACCESS_ANYONE",
                default: "read"
            },
            family:     {
                type: String,
                enum: {
                    values: ["read", "write"],
                    message: "INVALID_ACCESS_FAMILY"
                },
                required: "INVALID_ACCESS_FAMILY",
                default: "read"
            },
            prime:      {
                type: String,
                enum: {
                    values: ["read", "write"],
                    message: "INVALID_ACCESS_PRIME"
                },
                required: "INVALID_ACCESS_PRIME",
                default: "write"
            }
        },
        // habits
        wake:           { type: String, default: null, match: [TIME_REGEXP, "Invalid wake time"] },
        sleep:          { type: String, default: null, match: [TIME_REGEXP, "Invalid sleep time"] },
        breakfast:      { type: String, default: null, match: [TIME_REGEXP, "Invalid breakfast time"] },
        lunch:          { type: String, default: null, match: [TIME_REGEXP, "Invalid lunch time"] },
        dinner:         { type: String, default: null, match: [TIME_REGEXP, "Invalid dinner time"] },
        tz:             { type: String, default: "Etc/UTC" }, // default to UTC
        // child resources
        doctors:        [DoctorSchema],
        pharmacies:     [PharmacySchema],
        medications:    [MedicationSchema],
        entries:        [JournalEntrySchema], // 'daily' journal entries,
        doses:          [DoseSchema]
    });
    /*eslint-enable key-spacing */

    // fuzzy matching on name fields
    PatientSchema.plugin(fuzzy, { fields: ["firstName", "lastName"] });

    // IMPORTANT: if reset, all patient avatars should be deleted as well
    PatientSchema.plugin(autoIncrementId, { slug: "patientId" }); // auto incrementing IDs

    // various different modules
    require("./core.js")(PatientSchema);
    require("./sharing.js")(PatientSchema);
    require("./resources.js")(PatientSchema);
    require("./habits.js")(PatientSchema);
    require("./avatar.js")(PatientSchema, gfs);
    require("./schedule.js")(PatientSchema, zrpc);

    return mongoose.model("Patient", PatientSchema);
};
