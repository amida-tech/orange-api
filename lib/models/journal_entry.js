"use strict";
var mongoose        = require("mongoose"),
    moment          = require("moment"),
    errors          = require("../errors.js").ERRORS,
    async           = require("async"),
    autoIncrementId = require("./helpers/increment_plugin.js");

/*eslint-disable key-spacing */
// a schema to be nested inside a Patient containing their journal: each instance
// is a journal entry
var JournalEntrySchema = module.exports = new mongoose.Schema({
    _id:            { type: Number, required: true },
    date:           { type: Date, required: true },
    text:           { type: String, required: true },
    mood:           { type: String, required: false, default: "" },
    medicationIds:  [{ type: Number, ref: "Patient.Medication" }]
});
/*eslint-enable key-spacing */

JournalEntrySchema.plugin(autoIncrementId, { slug: "journalEntryId" }); // auto incrementing IDs

// ISO 8601
var DATE_FORMAT = "YYYY-MM-DDTHH:mm:ss.SSSZ";

// given a raw data object, update ourselves with it
// note we don't call save here
JournalEntrySchema.methods.setData = function (data) {
    if (typeof data.text !== "undefined") this.text = data.text;
    if (typeof data.mood !== "undefined") this.mood = data.mood;

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

    // as per API spec, we do want to completely overwrite the existing medications list
    // rather than combine the two
    // we validate each ID corresponds to a user in resources.js, but here we just check it's
    // numeric
    if (typeof data.medication_ids !== "undefined") {
        if (data.medication_ids.constructor !== Array) return errors.INVALID_RESOURCE_MEDICATION_ID;
        var invalid = data.medication_ids.some(function (id) {
            return typeof id !== "number";
        });
        if (invalid) return errors.INVALID_RESOURCE_MEDICATION_ID;

        this.medicationIds = data.medication_ids;
    }
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
