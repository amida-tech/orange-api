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
    _id:                { type: Number, required: true },
    date:               { type: Date, required: true },
    text:               { type: String, required: false },
    sideEffect:         { type: String, required: false },
    sideEffectSeverity: { type: Number, required: false,
                          min: [1, "INVALID_SIDEEFFECT"],
                          max: [10, "INVALID_SIDEEFFECT"] },
    mood:               { type: String, required: false, default: "" },
    moodSeverity:       { type: Number, required: false,
                          min: [1, "INVALID_MOOD"],
                          max: [10, "INVALID_MOOD"] },
    moodEmoji:          { type: String, required: false },
    activity:           { type: String, required: false },
    activityMinutes:    { type: Number, required: false, min: [1, "INVALID_ACTIVITY"] },
    medicationIds:      [{ type: Number, ref: "Patient.Medication" }],
    meditation:         { type: Boolean, required: true, default: false },
    meditationLength:   { type: Number, required: false },
    // for linking and updating automatically-created journal entries from doses
    doseId:             { type: Number, ref: "Patient.Dose", required: false },
    creator:            { type: String, required: true },
    changed:            { type: Boolean, required: true, default: false },
    role: {
        type: String,
        enum: {
            values: ["user", "clinician"],
            message: "INVALID_ROLE"
        },
        required: "INVALID_ROLE",
        default: "user"
    }
});
/*eslint-enable key-spacing */

// fuzzy matching on text field
JournalEntrySchema.plugin(fuzzy, { fields: ["text"] });

JournalEntrySchema.plugin(autoIncrementId, { slug: "journalEntryId" }); // auto incrementing IDs

// given a raw data object, update ourselves with it
// note we don't call save here
JournalEntrySchema.methods.setData = function (data) {
    if (typeof data.creator !== "undefined") this.creator = data.creator;
    if (typeof data.user !== "undefined") this.creator = data.user.email;
    if (typeof data.text !== "undefined") {
        if (this.text !== data.text) this.changed = true;
        this.text = data.text;
    }

    if (typeof data.mood !== "undefined") this.mood = data.mood;
    if (typeof data.moodSeverity !== "undefined") this.moodSeverity = data.moodSeverity;
    if ((data.mood && !data.moodSeverity) || (!data.mood && data.moodSeverity)) {
        return errors.INVALID_MOOD;
    }

    if (typeof data.sideEffect !== "undefined") this.sideEffect = data.sideEffect;
    if (typeof data.sideEffectSeverity !== "undefined") this.sideEffectSeverity = data.sideEffectSeverity;
    if ((data.sideEffect && !data.sideEffectSeverity) || (!data.sideEffect && data.sideEffectSeverity)) {
        return errors.INVALID_SIDEEFFECT;
    }

    if (typeof data.activity !== "undefined") this.activity = data.activity;
    if (typeof data.activityMinutes !== "undefined") this.activityMinutes = data.activityMinutes;
    if ((data.activity && !data.activityMinutes) || (!data.activity && data.activityMinutes)) {
        return errors.INVALID_ACTIVITY;
    }

    if (typeof data.moodEmoji !== "undefined") {
        if(!/^\\U[\da-f]{1,8}$/i.test(data.moodEmoji) && data.moodEmoji !== null){
            return errors.INVALID_EMOJI;
        }
        this.moodEmoji = data.moodEmoji;
    }

    if(typeof data.meditation !== "undefined"){
        if(typeof data.meditation === "string" || typeof data.meditation === "number" || data.meditation === null)
            return errors.INVALID_MEDITATION_VALUE;
        if (this.role === "clinician")
            return errors.INVALID_CLINICIAN_NOTE;
        this.meditation = data.meditation;
    }

	if(typeof data.meditationLength !== "undefined"){
		if(!data.meditation && data.meditationLength !== null)
			return errors.MEDITATION_REQUIRED;
		if(data.meditationLength === 0)
			return errors.MEDITATIONLENGTH_ZERO;
		if(typeof data.meditationLength !== "number" && data.meditationLength !== null)
			return errors.INVALID_MEDITATION_LENGTH;

		this.meditationLength = data.meditationLength;
	}

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
    if (typeof data.medication_ids !== "undefined") this.medicationIds = data.medication_ids;

    if (typeof data.role !== "undefined") this.role = data.role;

    // clinician's can't log mood notes
    const invalidClinicianKeys = ["mood", "moodEmoji"];
    const invalidClinicianNote = invalidClinicianKeys
        .map(k => data[k])
        .some(v => typeof v !== "undefined");
    if (this.role === "clinician" && invalidClinicianNote) return errors.INVALID_CLINICIAN_NOTE;
};

// format an entry so it can be output directly to the client over the API
JournalEntrySchema.methods.getData = function () {
    // convert medicationIds to medication_ids
    /*eslint-disable key-spacing */
    var data = {
        _id:            this._id,
        date:           moment(this.date).format(DATE_FORMAT),
        text:           this.text,
        medication_ids: this.medicationIds,
        creator:        this.creator,
        role:           this.role
    };
    /*eslint-enable key-spacing */

    // optionally add mood
    if (typeof this.mood !== "undefined" && this.mood !== null) data.mood = this.mood;
    if (typeof this.moodSeverity !== "undefined" && this.moodSeverity !== null) data.moodSeverity = this.moodSeverity;
    if (typeof this.moodEmoji !== "undefined" && this.moodEmoji !== null) data.moodEmoji = this.moodEmoji;
    if (typeof this.sideEffect !== "undefined" && this.sideEffect !== null) data.sideEffect = this.sideEffect;
    if (typeof this.sideEffectSeverity !== "undefined" && this.sideEffectSeverity !== null) data.sideEffectSeverity = this.sideEffectSeverity;

    if (typeof this.activity !== "undefined" && this.activity !== null) data.activity = this.activity;
    if (typeof this.activityMinutes !== "undefined" && this.activityMinutes !== null) data.activityMinutes = this.activityMinutes;


    if (typeof this.meditation !== "undefined" && this.meditation !== null) data.meditation = this.meditation;

    if (typeof this.meditationLength !== "undefined" && this.meditationLength !== null)
        data.meditationLength = this.meditationLength;
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
