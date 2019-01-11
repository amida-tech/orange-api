"use strict";
var mongoose = require("mongoose");

// regular expression to validate hh:mm a times
var TIME_REGEXP     = require("../helpers/time.js").TIME_REGEXP,
    autoIncrementId = require("../helpers/increment_plugin.js"),
    fuzzy           = require("../helpers/fuzzy_plugin.js");

// schemas to nest of child resources (e.g., doctors, pharmacies)
var DoctorSchema        = require("../doctor.js"),
    PharmacySchema      = require("../pharmacy.js"),
    MedicationSchema    = require("../medication.js"),
    JournalEntrySchema  = require("../journal_entry.js"),
    DoseSchema          = require("../dose.js"),
    ShareSchema         = require("../share.js"),
    EventEntrySchema    = require("../event.js"),
    DocumentSignatureSchema = require("../document_signature.js"),
    EmergencyContactSchema    = require("../emergency_contact.js");


// getter functions to get the gridfs client passed in
module.exports = function (gfs) {
    /*eslint-disable key-spacing */
    var PatientSchema = new mongoose.Schema({
        firstName:      { type: String, required: true },
        lastName:       { type: String, default: "" },
        birthdate:      { type: String, default: null },
        sex:            { type: String, default: "unspecified" },
        phone:          { type: String, default: "" },
        creator:        { type: String, required: true },
        me:             { type: Boolean, default: false },
        instructorEmail: { type: String, default: null },
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
                default: "write"
            },
            family:     {
                type: String,
                enum: {
                    values: ["read", "write"],
                    message: "INVALID_ACCESS_FAMILY"
                },
                required: "INVALID_ACCESS_FAMILY",
                default: "write"
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
        doctors:            [DoctorSchema],
        pharmacies:         [PharmacySchema],
        medications:        [MedicationSchema],
        entries:            [JournalEntrySchema], // 'daily' journal entries,
        doses:              [DoseSchema],
        events:             [EventEntrySchema],
        emergencyContacts:  [EmergencyContactSchema],
        documentSignatures: [DocumentSignatureSchema]

    });
    /* eslint-enable key-spacing */



    // fuzzy matching on name fields
    PatientSchema.plugin(fuzzy, { fields: ["firstName", "lastName"] });

    // IMPORTANT: if reset, all patient avatars should be deleted as well
    PatientSchema.plugin(autoIncrementId, { slug: "patientId" }); // auto incrementing IDs

    if (process.env.NODE_ENV !== "test") {
      PatientSchema.virtual("sharesCount").get(function() {
        return this.shares.length;
      });
    }

    // If we're updating a user's default patient info, we also update the user's info
    // Only for firstName, lastName, phone
    PatientSchema.post("save", function (next) {
        if (!this.isNew && this.me) {
            mongoose.model("User").findOne({ email: this.creator }).exec().then((user) => {
                if (user !== null) {
                    if (user.firstName !== this.firstName ||
                        user.lastName !== this.lastName ||
                        user.phone !== this.phone) {
                        user.firstName = this.firstName;
                        user.lastName = this.lastName;
                        user.phone = this.phone;
                        return user.save();
                    }
                }
                // if no user, we just continue
                return Promise.resolve();
            }).then(() => next()).catch(err => next(err));
        } else {
            next();
        }
    });

    // various different modules
    require("./core.js")(PatientSchema);
    require("./sharing.js")(PatientSchema);
    require("./resources.js")(PatientSchema);
    require("./habits.js")(PatientSchema);
    require("./avatar.js")(PatientSchema, gfs);
    require("./schedule.js")(PatientSchema);

    return mongoose.model("Patient", PatientSchema);
};
