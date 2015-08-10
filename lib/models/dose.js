"use strict";
var mongoose        = require("mongoose"),
    moment          = require("moment"),
    errors          = require("../errors.js").ERRORS,
    autoIncrementId = require("./helpers/increment_plugin.js"),
    DATE_FORMAT     = require("./helpers/time.js").DATE_FORMAT;

/*eslint-disable key-spacing */
// A schema to be nested inside a Patient containing a "dose": an event at which
// a patient took their medication.
// Schematically this should probably be nested inside a Medication rather than a Patient,
// but this makes more sense logistically (API and app will be querying for all doses
// or a dose with a specific ID much more frequently than a dose for a specific
// medication or a dose with a specific ID for a specific medication).
var DoseSchema = module.exports = new mongoose.Schema({
    _id:            { type: Number, required: true },
    medicationId:   { type: Number, required: true, ref: "Patient.Medication" },
    date:           { type: Date, required: true },
    notes:          { type: String, default: "" },
    taken:          { type: Boolean, required: true },
    scheduled:      { type: Number, required: false } // id for time in schedule
});
/*eslint-enable key-spacing */

DoseSchema.plugin(autoIncrementId, { slug: "doseId" }); // auto incrementing IDs

// given a raw data object, update ourselves with it
// note we don't call save here
DoseSchema.methods.setData = function (data) {
    if (typeof data.date !== "undefined") {
        // don't allow blank dates!
        if (data.date === "") return errors.DATE_REQUIRED;

        // validate the date in here, because casting to date (which could a) cause errors
        // and b) silently fail) happens before standard validation
        var date = moment.utc(data.date, DATE_FORMAT);
        if (!date.isValid()) {
            // set date to current date, otherwise mongoose will give date_required as
            // an additional error
            this.date = Date.now();
            // we explicitly handle this wherever use setData
            /*eslint-disable consistent-return */
            return errors.INVALID_DATE;
            /*eslint-enable consistent-return */
        }
        this.date = date;
    }

    if (typeof data.notes !== "undefined") this.notes = data.notes;
    if (typeof data.taken !== "undefined") {
        // validation
        if (typeof data.taken !== "boolean") return errors.INVALID_TAKEN;
        this.taken = data.taken;
    }
    if (typeof data.scheduled !== "undefined") this.scheduled = data.scheduled;
    // note changing of snake case to camel case
    if (typeof data.medication_id !== "undefined") this.medicationId = data.medication_id;
};

// format an entry so it can be output directly to the client over the API
DoseSchema.methods.getData = function () {
    // convert medicationId to medication_id
    /*eslint-disable key-spacing */
    var data = {
        _id:            this._id,
        medication_id:  this.medicationId,
        date:           moment(this.date).format(DATE_FORMAT),
        notes:          this.notes,
        taken:          this.taken,
        scheduled:      this.scheduled
    };
    /*eslint-enable key-spacing */

    // remove medication_id if medication has been expanded out
    if (typeof this.medication !== "undefined") {
        data.medication = this.medication;
        delete data.medication_id;
    }

    return data;
};

// expand out (populate) medication_id into a full medication object
DoseSchema.methods.expand = function (patient) {
    // no EmbeddedDocument.populate so we have to do things the more manual way...
    this.medication = patient.medications.id(this.medicationId);
    return this;
};

// use null values to reset optional notes field
DoseSchema.pre("save", function (next) {
    if (this.notes === null) this.notes = "";
    next();
});
