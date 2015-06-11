"use strict";
var mongoose        = require("mongoose"),
    errors          = require("../errors.js").ERRORS,
    DATE_REGEXP     = require("./helpers/time.js").DATE_REGEXP,
    autoIncrementId = require("./helpers/increment_plugin.js");

/*eslint-disable key-spacing */
// A schema to be nested inside a Patient containing an "adherence": an event at which
// a patient took their medication (hopefully at the correct time, hence the term adherence).
// Schematically this should probably be nested inside a Medication rather than a Patient,
// but this makes more sense logistically (API and app will be querying for all adherences
// or an adherence with a specific ID much more frequently than an adherence for a specific
// medication or an adherence with a specific ID for a specific medication).
var AdherenceSchema = module.exports = new mongoose.Schema({
    _id:            { type: Number, required: true },
    medicationId:   { type: Number, required: true, ref: "Patient.Medication" },
    date:           { type: Date, required: true },
    notes:          { type: String }
});
/*eslint-enable key-spacing */

AdherenceSchema.plugin(autoIncrementId, { slug: "adherenceId" }); // auto incrementing IDs

// given a raw data object, update ourselves with it
// note we don't call save here
AdherenceSchema.methods.setData = function (data) {
    if (typeof data.date !== "undefined") {
        // validate the date in here, because casting to date (which could a) cause errors
        // and b) silently fail) happens before standard validation
        if (!DATE_REGEXP.test(data.date)) {
            // set date to current date, otherwise mongoose will give date_required as
            // an additional error
            this.date = Date.now();
            return errors.INVALID_DATE;
        }
        this.date = data.date;
    }

    if (typeof data.notes !== "undefined") this.notes = data.notes;
    // note changing of snake case to camel case
    if (typeof data.medication_id !== "undefined") this.medicationId = data.medication_id;
};

// format an entry so it can be output directly to the client over the API
AdherenceSchema.methods.getData = function () {
    // convert medicationId to medication_id
    /*eslint-disable key-spacing */
    var data = {
        _id:            this._id,
        medication_id:  this.medicationId,
        date:           this.date,
        notes:          this.notes
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
AdherenceSchema.methods.expand = function (callback) {
    // no EmbeddedDocument.populate so we have to do things the more manual way...
    mongoose.model("Medication").findById(this.medicationId, function (err, medication) {
        if (err) return callback(err);
        this.medication = medication;
        callback(null, this);
    });
};
