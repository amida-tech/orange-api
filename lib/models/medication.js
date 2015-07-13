"use strict";
var mongoose        = require("mongoose"),
    moment          = require("moment-timezone"),
    DATE_REGEXP     = require("./helpers/time.js").DATE_ONLY_REGEXP,
    errors          = require("../errors.js").ERRORS,
    numbers         = require("./helpers/numbers.js"),
    autoIncrementId = require("./helpers/increment_plugin.js"),
    fuzzy           = require("./helpers/fuzzy_plugin.js");

// require directly as it's a model but not a mongoose schema
var Schedule = require("./schedule/schedule.js");

/*eslint-disable key-spacing */
// a schema to be nested inside a Patient representing their medications
var MedicationSchema = module.exports = new mongoose.Schema({
    // provide sensible defaults for everything optional apart from doctorId and pharmacyId
    // so we can directly return values over the API
    _id:            { type: Number, required: true },
    name:           { type: String, required: true },
    rxNorm:         { type: String, default: "" },
    rxNumber:       { type: String, default: "" },
    ndc:            { type: String, default: "" },
    dose:           {
        quantity:   { type: Number, default: 1 },
        unit:       { type: String, default: "dose" }
    },
    route:          { type: String, default: "" },
    form:           { type: String, default: "" },
    quantity:       { type: Number, default: 1 },
    type:           { type: String, default: "" },
    rawSchedule:    { type: Object, default: {} },
    fillDate:       { type: String, default: null },
    permissions: {
        anyone: {
            type: String,
            enum: {
                values: ["read", "write", "default", "none"],
                message: "INVALID_ACCESS_ANYONE"
            },
            required: "INVALID_ACCESS_ANYONE",
            default: "default"
        },
        family: {
            type: String,
            enum: {
                values: ["read", "write", "default", "none"],
                message: "INVALID_ACCESS_FAMILY"
            },
            required: "INVALID_ACCESS_FAMILY",
            default: "default"
        },
        prime: {
            type: String,
            enum: {
                values: ["read", "write", "default", "none"],
                message: "INVALID_ACCESS_PRIME"
            },
            required: "INVALID_ACCESS_PRIME",
            default: "default"
        }
    },
    doctorId:       { type: Number, ref: "Patient.Doctor", default: null },
    pharmacyId:     { type: Number, ref: "Patient.Pharmacy", default: null }
});
/*eslint-enable key-spacing */

// fuzzy matching on name field
MedicationSchema.plugin(fuzzy, { fields: ["name"] });

MedicationSchema.plugin(autoIncrementId, { slug: "medicationId" }); // auto incrementing IDs

// mapping between API keys and mongoose keys
// we use snake_case in API requests and camelCase internally here
var MAPPINGS = {
    name: "name",
    rxNorm: "rx_norm",
    rxNumber: "rx_number",
    ndc: "ndc",
    dose: "dose",
    route: "route",
    form: "form",
    quantity: "quantity",
    type: "type",
    fillDate: "fill_date",
    doctorId: "doctor_id",
    pharmacyId: "pharmacy_id"
};

// the reverse of the above mapping, but here we do include optional keys
var REVERSE_MAPPINGS = {
    _id: "_id",
    name: "name",
    rx_norm: "rxNorm",
    rx_number: "rxNumber",
    ndc: "ndc",
    dose: "dose",
    route: "route",
    form: "form",
    quantity: "quantity",
    type: "type",
    fill_date: "fillDate",
    doctor_id: "doctorId",
    pharmacy_id: "pharmacyId",
    doctor: "doctor",
    pharmacy: "pharmacy"
};

// given a raw data object, update ourselves with it
// any non-trivial validations are performed in here
// note we don't call save here
MedicationSchema.methods.setData = function (rawData, habits) {
    // initially transform data from API keys to internal keys
    var data = {};
    for (var key in MAPPINGS) {
        // ignore prototypical values
        if (MAPPINGS.hasOwnProperty(key)) {
            var dataKey = MAPPINGS[key];
            // store data if it's present
            if (typeof rawData[dataKey] !== "undefined") data[key] = rawData[dataKey];
        }
    }

    // check quantity is a positive integer
    if (typeof data.quantity !== "undefined" && data.quantity !== null && !numbers.isNatural(data.quantity)) {
        return errors.INVALID_QUANTITY;
    }

    // null to reset dose to default
    if (data.dose === null) data.dose = { quantity: 1, unit: "dose" };

    // check dose is an object containing quantity and unit keys,
    // where unit is a non-blank string and quantity is a natural number
    var dose = data.dose;
    if (typeof dose !== "undefined") {
        // overall
        if (typeof dose !== "object") return errors.INVALID_DOSE;
        // unit
        if (typeof dose.unit !== "string" || dose.unit.length === 0) return errors.INVALID_DOSE;
        // quantity
        if (!numbers.isNatural(dose.quantity)) return errors.INVALID_DOSE;
    }

    // if present, check fillDate is in valid YYYY-MM-DD format
    if (typeof data.fillDate !== "undefined" && data.fillDate !== null) {
        if (!(DATE_REGEXP).exec(data.fillDate)) return errors.INVALID_FILL_DATE;
    }

    // store data properties in ourselves
    for (key in MAPPINGS) {
        if (MAPPINGS.hasOwnProperty(key) && data.hasOwnProperty(key)) {
            this[key] = data[key];
        }
    }

    // store, parse and validate schedule
    // set habits to use in parsing schedule
    this.habits = habits;
    if (typeof rawData.schedule !== "undefined") {
        // this.schedule is a virtual
        this.schedule = rawData.schedule;
        if (!this.schedule.isValid()) return errors.INVALID_SCHEDULE;
    }

    // store permissions
    if (typeof rawData.access_anyone !== "undefined") this.permissions.anyone = rawData.access_anyone;
    if (typeof rawData.access_family !== "undefined") this.permissions.family = rawData.access_family;
    if (typeof rawData.access_prime !== "undefined") this.permissions.prime = rawData.access_prime;
};

// invert the mapping performed above to format data for the API
MedicationSchema.methods.getData = function (patient) {
    var data = {};
    for (var key in REVERSE_MAPPINGS) {
        // ignore prototypical values
        if (REVERSE_MAPPINGS.hasOwnProperty(key)) {
            var internalKey = REVERSE_MAPPINGS[key];
            // store data if it's present
            if (typeof this[internalKey] !== "undefined") data[key] = this[internalKey];
        }
    }

    // format access permissions
    data.access_anyone = this.permissions.anyone;
    data.access_family = this.permissions.family;
    data.access_prime = this.permissions.prime;

    // number of 'pill's left
    data.number_left = this.numberLeft(patient);

    // schedule
    data.schedule = this.schedule.toObject();

    // if we have the full doctor object, we don't need doctor_id
    if ("doctor" in data) delete data.doctor_id;
    if ("pharmacy" in data) delete data.pharmacy_id;

    return data;
};

// authorize access to a medication for a specific desired access level, user and patient
MedicationSchema.methods.authorize = function (access, user, patient) {
    // access must be either read of write
    if (access !== "write" && access !== "read") return errors.INVALID_ACCESS;

    // find the share between the user and patient
    var share = patient.shareForEmail(user.email);
    if (typeof share === "undefined" || share === null) return errors.UNAUTHORIZED;

    // owner always has permission
    if (share.group === "owner") return null;

    // find the medication-specific access level
    var medicationAccess = this.permissions[share.group];

    // explicit write permissions mean we can do anything
    if (medicationAccess === "write") return null;

    // explicit read permissions work only if access is read
    if (medicationAccess === "read") {
        if (access === "read") return null;
        return errors.UNAUTHORIZED;
    }

    // always deny 'none'
    if (medicationAccess === "none") return errors.UNAUTHORIZED;

    // otherwise medicationAccess should be 'default' so we delegate authorization to the patient
    return patient.authorize(user, access);
};

// expand out (populate) doctor and pharmacy into fully-featured objects
MedicationSchema.methods.expand = function (patient) {
    // no EmbeddedDocument.populate so we have to do things the more manual way...
    this.doctor = patient.doctors.id(this.doctorId);
    this.pharmacy = patient.pharmacies.id(this.pharmacyId);

    return this;
};

// generate a schedule for when the medication should be taken, between two date ranges
//  we only look at the dates of start/end, not the times
MedicationSchema.methods.generateSchedule = function (start, end, patient) {
    return this.schedule.generate(start, end, patient.habits, this.numDoses(patient));
};

// using quantity, dose, fill date and doses, calculate the number of 'pill's left of the med
MedicationSchema.methods.numDoses = function (patient) {
    // don't do anything unless fillDate, quantity and dose are present
    if (this.fillDate === null || this.quantity === null || this.dose === null) return 0;

    // count doses taken since fill date by the patient
    return patient.doses.filter(function (dose) {
        // doses for this medication
        return dose.medicationId === this._id;
    }.bind(this)).filter(function (dose) {
        // doses taken since fill date
        return moment(dose.date).isAfter(moment.tz(this.fillDate, patient.tz));
    }.bind(this)).length;
};
MedicationSchema.methods.numberLeft = function (patient) {
    // don't do anything unless fillDate, quantity and dose are present
    if (this.fillDate === null || this.quantity === null || this.dose === null) return null;

    // calculate number of doses left
    // (initial number) - (number doses) * (number per dose)
    var numberLeft = this.quantity - this.numDoses(patient) * this.dose.quantity;

    // cap to zero
    return Math.max(numberLeft, 0);
};

// virtual getter for Schedule object (whose raw data is stored as rawSchedule)
MedicationSchema.virtual("schedule").get(function () {
    // if schedule has already been parsed, (by setting .schedule = or by getting .schedule
    // already), return it
    if (typeof this.parsedSchedule !== "undefined") return this.parsedSchedule;

    // otherwise parse it, store it (for future calls) and return it
    this.parsedSchedule = new Schedule(this.rawSchedule, this.habits || {});
    return this.parsedSchedule;
}).set(function (rawSchedule) {
    this.rawSchedule = rawSchedule;
    this.parsedSchedule = new Schedule(rawSchedule, this.habits || {});
});

// wrapper function around schedule.match
MedicationSchema.methods.match = function (doses, client, habits, callback) {
    return this.schedule.match(doses, client, habits, callback);
};

// use null values to reset optional fields
MedicationSchema.pre("save", function (next) {
    if (this.rxNorm === null) this.rxNorm = "";
    if (this.rxNumber === null) this.rxNumber = "";
    if (this.ndc === null) this.ndc = "";
    if (this.dose === null) this.dose.quantity = 1;
    if (this.route === null) this.route = "";
    if (this.form === null) this.form = "";
    if (this.quantity === null) this.quantity = 1;
    if (this.type === null) this.type = "";
    next();
});
