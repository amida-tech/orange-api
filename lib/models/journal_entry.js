"use strict";
var mongoose        = require("mongoose"),
    errors          = require("../errors.js").ERRORS,
    DATE_REGEXP     = require("./helpers/time.js").DATE_REGEXP,
    async           = require("async"),
    autoIncrementId = require("./helpers/increment_plugin.js");

/*eslint-disable key-spacing */
// a schema to be nested inside a Patient containing their journal: each instance
// is a journal entry
var JournalEntrySchema = module.exports = new mongoose.Schema({
    _id:            { type: Number, required: true },
    date:           { type: Date, required: true },
    text:           { type: String, required: true },
    medicationIds:  [{ type: Number, ref: "Patient.Medication" }]
});
/*eslint-enable key-spacing */

JournalEntrySchema.plugin(autoIncrementId, { slug: "journalEntryId" }); // auto incrementing IDs

// given a raw data object, update ourselves with it
// note we don't call save here
JournalEntrySchema.methods.setData = function (data) {
    if (typeof data.text !== "undefined") this.text = data.text;

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

    // as per API spec, we do want to completely overwrite the existing medications list
    // rather than combine the two
    if (typeof data.medication_ids !== "undefined") this.medicationIds = data.medication_ids;
};

// format an entry so it can be output directly to the client over the API
JournalEntrySchema.methods.getData = function () {
    // convert medicationIds to medication_ids
    /*eslint-disable key-spacing */
    var data = {
        _id:            this._id,
        date:           this.date,
        text:           this.text,
        medication_ids: this.medicationIds
    };
    /*eslint-enable key-spacing */

    // remove medication_ids if medications has been expanded out
    if (typeof this.medications !== "undefined") {
        data.medications = this.medications;
        delete data.medication_ids;
    }

    return data;
};

// expand out (populate) medication_ids into a list of full medication objects
JournalEntrySchema.methods.expand = function (callback) {
    // no EmbeddedDocument.populate so we have to do things the more manual way...
    // async.map seems to hang on empty lists
    if (this.medicationIds.length === 0) {
        this.medications = [];
        return callback(null, this);
    }

    var Medication = mongoose.model("Medication");
    // map over and find all medications
    async.map(this.medicationIds, Medication.findById.bind(Medication), function (err, medications) {
        if (err) return callback(err);
        this.medications = medications;
        callback(null, this);
    }.bind(this));
};
