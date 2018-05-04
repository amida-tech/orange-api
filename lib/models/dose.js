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
    date:           {
        utc:        { type: Date, required: true },
        timezone:   { type: String, required: true }
    },
    dose:           {
        quantity:   { type: Number, default: 1 },
        unit:       { type: String, default: "dose" }
    },
    notes:          { type: String, default: "" },
    taken:          { type: Boolean, required: true },
    // optional reference to JournalEntry created to contain the `notes` field for this dose
    entryId:        { type: Number, required: false, ref: "Patient.JournalEntry" },
    scheduled:      { type: Number, required: false, default: null } // id for time in schedule
});
/*eslint-enable key-spacing */

DoseSchema.plugin(autoIncrementId, { slug: "doseId" }); // auto incrementing IDs

// given a raw data object, update ourselves with it
// note we don't call save here
DoseSchema.methods.setData = function (data) {
    if (typeof data.date !== "undefined") {
        // don't allow blank dates!
        console.log('!!!!!! ' + data.date.timezone +  ' !!!!!!')
        console.log('!!!!!! ' + !moment.tz.zone(data.date.timezone)  +  ' !!!!!!')

        if (typeof data.date !== "object") return errors.INVALID_DATE;
        if (data.date.utc === "") return errors.DATE_REQUIRED;
        if (!moment.tz.zone(data.date.timezone)) return errors.INVALID_TIMEZONE;
        // validate the date in here, because casting to date (which could a) cause errors
        // and b) silently fail) happens before standard validation
        var momentTime = moment(data.date.utc, DATE_FORMAT);
        var date = momentTime.utc();
        if (!date.isValid()) {
            // set date to current date, otherwise mongoose will give date_required as
            // an additional error
            this.date = Date.now();
            // we explicitly handle this wherever use setData
            /*eslint-disable consistent-return */
            return errors.INVALID_DATE;
            /*eslint-enable consistent-return */
        }
        this.date.utc = date;
        this.date.timezone = data.date.timezone;
    }

    if (typeof data.dose !== "undefined") this.dose = data.dose;

    if (typeof data.notes !== "undefined") this.notes = data.notes;
    if (typeof data.taken !== "undefined") {
        // validation
        if (typeof data.taken !== "boolean") return errors.INVALID_TAKEN;
        this.taken = data.taken;
    }
    if (typeof data.scheduled !== "undefined") {
        // basic type validation
        // more extensive validation is done in lib/models/patients/resources.js (see explanation there)
        if (typeof data.scheduled !== "number" && data.scheduled !== null) return errors.INVALID_SCHEDULED;
        this.scheduled = data.scheduled;
    }
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
        date:           {utc: moment(this.date.utc).format(DATE_FORMAT), timezone: this.date.timezone },
        dose:           this.dose,
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
