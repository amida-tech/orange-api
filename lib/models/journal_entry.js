"use strict";
var mongoose        = require("mongoose"),
    moment          = require("moment"),
    errors          = require("../errors.js").ERRORS,
    autoIncrementId = require("./helpers/increment_plugin.js"),
    fuzzy           = require("./helpers/fuzzy_plugin.js"),
    DATE_FORMAT     = require("./helpers/time.js").DATE_FORMAT;

/*eslint-disable key-spacing */
// a schema to be nested inside a Patient containing their journal: each instance
// is a journal entry
var JournalEntrySchema = module.exports = new mongoose.Schema({
    _id:            { type: Number, required: true },
    date:           { type: Date, required: true },
    text:           { type: String, required: true },
    mood:           { type: String, required: false, default: "" },
    medicationIds:  [{ type: Number, ref: "Patient.Medication" }],
    // for linking and updating automatically-created journal entries from doses
    doseId:         { type: Number, ref: "Patient.Dose", required: false },
    changed:        { type: Boolean, required: true, default: false }
});
/*eslint-enable key-spacing */

// fuzzy matching on text field
JournalEntrySchema.plugin(fuzzy, { fields: ["text"] });

JournalEntrySchema.plugin(autoIncrementId, { slug: "journalEntryId" }); // auto incrementing IDs

// given a raw data object, update ourselves with it
// note we don't call save here
JournalEntrySchema.methods.setData = function (data) {
    if (typeof data.text !== "undefined") {
        if (this.text !== data.text) this.changed = true;
        this.text = data.text;
    }
    if (typeof data.mood !== "undefined") this.mood = data.mood;

    if (typeof data.date !== "undefined") {
        // don't allow blank dates!
        if (data.date === "") return errors.DATE_REQUIRED;

        // validate the date in here, because casting to date (which could a) cause errors
        // and b) silently fail) happens before standard validation
        var date = moment.utc(data.date);
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
        date:           moment(this.date).format(DATE_FORMAT),
        text:           this.text,
        medication_ids: this.medicationIds
    };
    /*eslint-enable key-spacing */

    // optionally add mood
    if (typeof this.mood !== "undefined" && this.mood !== null) data.mood = this.mood;

    // remove medication_ids if medications has been expanded out
    if (typeof this.medications !== "undefined") {
        data.medications = this.medications;
        delete data.medication_ids;
    }
    // find all hashtags in the text
    data.hashtags = [];
    if (typeof this.text !== "undefined" && this.text !== null) {
        var matches = this.text.match(/(?: |^)#(\w+)/g);
        if (matches !== null) {
            data.hashtags = matches.map(function (match) {
                // turn " #awesome" => "awesome"
                return match.replace(/ ?#/, "");
            });
            // remove duplicates
            data.hashtags = data.hashtags.filter(function (tag, index, self) {
                return self.indexOf(tag) === index;
            });
        }
    }

    return data;
};

// expand out (populate) medication_ids into a list of full medication objects
JournalEntrySchema.methods.expand = function (patient) {
    // no EmbeddedDocument.populate so we have to do things the more manual way...
    this.medications = this.medicationIds.map(function (medicationId) {
        return patient.medications.id(medicationId);
    });

    return this;
};

// use null values to reset optional fields
JournalEntrySchema.pre("save", function (next) {
    if (this.mood === null) this.mood = "";
    if (this.medicationIds === null) this.medicationIds = [];
    next();
});
