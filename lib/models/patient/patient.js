"use strict";
var mongoose = require("mongoose");

// regular expression to validate HH:MM times
var TIME_REGEXP     = require("../helpers/time.js").TIME_REGEXP,
    autoIncrementId = require("../helpers/increment_plugin.js");

// schemas to nest of child resources (e.g., doctors, pharmacies)
var DoctorSchema        = require("../doctor.js"),
    PharmacySchema      = require("../pharmacy.js"),
    MedicationSchema    = require("../medication.js"),
    JournalEntrySchema  = require("../journal_entry.js");

/*eslint-disable key-spacing */
var PatientSchema = new mongoose.Schema({
    name:           { type: String, required: true },
    // we heavily rely on the fact that only one share per user per patient exists: mongoose doens't support unique
    // validation, so this is just implemented in the various methods below. beware of directly updating Patients for
    // this reason.
    shares: [{
        user:       { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        access:     { type: String, enum: ["read", "write"], required: true }
    }],
    // habits
    wake:           { type: String, default: null, match: [TIME_REGEXP, "Invalid wake time"] },
    sleep:          { type: String, default: null, match: [TIME_REGEXP, "Invalid sleep time"] },
    breakfast:      { type: String, default: null, match: [TIME_REGEXP, "Invalid breakfast time"] },
    lunch:          { type: String, default: null, match: [TIME_REGEXP, "Invalid lunch time"] },
    dinner:         { type: String, default: null, match: [TIME_REGEXP, "Invalid dinner time"] },
    // child resources
    doctors:        [DoctorSchema],
    pharmacies:     [PharmacySchema],
    medications:    [MedicationSchema],
    entries:        [JournalEntrySchema] // 'daily' journal entries
});
/*eslint-enable key-spacing */
PatientSchema.plugin(autoIncrementId, { slug: "patientId" }); // auto incrementing IDs

// various different modules
require("./core.js")(PatientSchema);
require("./sharing.js")(PatientSchema);
require("./resources.js")(PatientSchema);
require("./habits.js")(PatientSchema);

module.exports = mongoose.model("Patient", PatientSchema);
