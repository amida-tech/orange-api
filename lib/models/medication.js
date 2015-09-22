"use strict";
var mongoose        = require("mongoose"),
    moment          = require("moment-timezone"),
    extend          = require("xtend"),
    deepEqual       = require("deep-equal"),
    util            = require("util"),
    DATE_REGEXP     = require("./helpers/time.js").DATE_ONLY_REGEXP,
    errors          = require("../errors.js").ERRORS,
    numbers         = require("./helpers/numbers.js"),
    autoIncrementId = require("./helpers/increment_plugin.js"),
    fuzzy           = require("./helpers/fuzzy_plugin.js"),
    ScheduleMatcher = require("./helpers/schedule_matcher.js");

// require directly as it's a model but not a mongoose schema
var Schedule = require("./schedule/schedule.js");

/*eslint-disable key-spacing */
// a schema to be nested inside a Patient representing their medications
var MedicationSchema = module.exports = new mongoose.Schema({
    // provide sensible defaults for everything optional apart from doctorId and pharmacyId
    // so we can directly return values over the API
    _id:            { type: Number, required: true },
    name:           { type: String, required: true },
    status:         { type: String, default: "active" },
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
    brand:          { type: String, default: "" },
    origin:         { type: String, default: "" },
    importId:       { type: Number, default: null },
    schedules:      { type: Array, default: [] },
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
    pharmacyId:     { type: Number, ref: "Patient.Pharmacy", default: null },
    creator:        { type: String, required: false },
    notes:          { type: String, default: "" }
});
/*eslint-enable key-spacing */

// fuzzy matching on name field
MedicationSchema.plugin(fuzzy, { fields: ["name"] });

MedicationSchema.plugin(autoIncrementId, { slug: "medicationId" }); // auto incrementing IDs

// mapping between API keys and mongoose keys
// we use snake_case in API requests and camelCase internally here
var MAPPINGS = {
    name: "name",
    status: "status",
    rxNorm: "rx_norm",
    rxNumber: "rx_number",
    ndc: "ndc",
    dose: "dose",
    route: "route",
    form: "form",
    quantity: "quantity",
    type: "type",
    brand: "brand",
    origin: "origin",
    fillDate: "fill_date",
    doctorId: "doctor_id",
    pharmacyId: "pharmacy_id",
    importId: "import_id",
    notes: "notes"
};

// the reverse of the above mapping, but here we do include optional keys
var REVERSE_MAPPINGS = {
    _id: "_id",
    name: "name",
    status: "status",
    rx_norm: "rxNorm",
    rx_number: "rxNumber",
    ndc: "ndc",
    dose: "dose",
    route: "route",
    form: "form",
    quantity: "quantity",
    type: "type",
    brand: "brand",
    origin: "origin",
    fill_date: "fillDate",
    doctor_id: "doctorId",
    pharmacy_id: "pharmacyId",
    doctor: "doctor",
    pharmacy: "pharmacy",
    import_id: "importId",
    notes: "notes"
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
        if (!numbers.isPositive(dose.quantity)) return errors.INVALID_DOSE;
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

    // if present, check import_id is a number
    if (typeof data.importId !== "undefined" && data.importId !== null) {
        if (typeof data.importId !== "number") return errors.INVALID_IMPORT_ID;
    }

    // store, parse and validate schedule
    // set habits to use in parsing schedule
    this.habits = habits;
    if (typeof rawData.schedule !== "undefined") {
        // don't accept time IDs from the user: we generate those automatically
        // also add default notification settings
        if (typeof rawData.schedule === "object" && rawData.schedule !== null) {
            var times = rawData.schedule.times;
            if (typeof times === "object" && times !== null && times.constructor === Array) {
                times = times.map(function (time) {
                    // ignore ID
                    delete time._id;
                    delete time.id;

                    // add notification settings
                    time.notifications = {
                        default: 30
                    };

                    return time;
                });
                rawData.schedule.times = times;
            }
        }

        // this.schedule is a virtual
        this.schedule = rawData.schedule;
        if (!this.schedule.isValid()) return errors.INVALID_SCHEDULE;
    }

    // store permissions
    if (typeof rawData.access_anyone !== "undefined") this.permissions.anyone = rawData.access_anyone;
    if (typeof rawData.access_family !== "undefined") this.permissions.family = rawData.access_family;
    if (typeof rawData.access_prime !== "undefined") this.permissions.prime = rawData.access_prime;

    // user who created medication
    // TODO: set this.creator equal to user email rather than having to pass that in from the controller
    if (typeof rawData.creator !== "undefined") this.creator = rawData.creator;
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
    if (typeof data.schedule.times !== "undefined" && data.schedule.times !== null) {
        // remove _id keys (we have id keys present already) on schedule times
        data.schedule.times = data.schedule.times.map(function (time) {
            delete time._id;
            return time;
        });

        // convert hh:mm a times from UTC (stored internally) to local time (API facing)
        data.schedule.times = data.schedule.times.map(function (item) {
            if (item.type === "exact") {
                item.time = moment.utc(item.time, "hh:mm a").tz(patient.tz).format("hh:mm a");
            }
            return item;
        });
    }

    // schedule summary
    // end date is not particularly relevant, and we use start date as today (it's not
    // that important, it's just used for schedule cycle start dates)
    var tz = "Etc/UTC";
    if (typeof patient !== "undefined" && patient !== null && typeof patient.tz === "string" && patient.tz.length > 0)
        tz = patient.tz;
    var start = moment.tz(tz);
    var end = moment(start).add(7, "days");
    data.schedule_summary = this.schedule.toSummary(start, end, tz, false, true);

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

    // likewise the user that created the medication always has access
    if (typeof this.creator === "string" && this.creator.length > 0 && this.creator === user.email) return null;

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

    // otherwise medicationAccess should be 'default' so:
    //  - default for family:
    //      - if as_needed then write
    //      - else read
    //  - deafult for anyone:
    //      - read
    //  - default for prime: delegate to patient
    if (share.group === "family") {
        if (access === "read") return null;
        if (!this.schedule.asNeeded) return errors.UNAUTHORIZED;
        return null;
    } else if (share.group === "anyone") {
        if (access === "read") return null;
        return errors.UNAUTHORIZED;
    } else {
        return patient.authorize(user, access);
    }
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
MedicationSchema.methods.generateSchedule = function (globalStart, globalEnd, patient, userId) {
    var tz = "Etc/UTC";
    var habits = patient.habits;
    if (typeof habits !== "undefined" && habits !== null && typeof habits.tz === "string") tz = habits.tz;

    // console.log();
    // console.log("globalStart ", globalStart.toString());
    // console.log("globalEnd ", globalEnd.toString());

    globalStart = moment.tz(globalStart, "YYYY-MM-DD", tz).startOf("day");
    globalEnd = moment.tz(globalEnd, "YYYY-MM-DD", tz).startOf("day");
    if (!globalStart.isValid()) throw errors.INVALID_START_DATE;
    // if (!globalEnd.isValid()) console.log("THROWING INVALID END 2");
    if (!globalEnd.isValid()) throw errors.INVALID_END_DATE;
    // check start date is before end date
    if (globalEnd < globalStart) throw errors.INVALID_END_DATE;

    // for each schedule calculate the date range that schedule was in effect
    var schedules = [];
    var schedule;
    var s;
    for (var i = 0; i < this.schedules.length; i++) {
        // console.log("schedule %d of %d", i + 1, this.schedules.length);
        // console.log("schedule date %s", new Date(this.schedules[i].date));
        // console.log("calculating start");
        var start = null;
        start = (this.schedules[i] || {}).date;
        // console.log(start.toString());
        if (typeof start === "undefined") start = null;
        if (start !== null) start = new Date(start);
        // console.log((start || "null").toString());
        if (start === null || start < globalStart) {
            // console.log("setting start to globalstart");
            start = globalStart;
        }

        // console.log((start || "null").toString());
        if (start > globalEnd) {
            // console.log("breaking");
            // console.log();
            // console.log();
            // console.log();
            // console.log();
            continue;
        }
        // console.log();

        var moreSchedules = (i !== this.schedules.length - 1);
        // console.log("calculating end");
        var end = null;
        if (i !== this.schedules.length - 1) {
            end = (this.schedules[i + 1] || {}).date;
            // console.log(end.toString());
            if (typeof end === "undefined") end = null;
        }
        if (end !== null) end = new Date(end);
        // console.log((end || "null").toString());
        if (end === null || end > globalEnd) {
            moreSchedules = false;
            end = globalEnd;
        }
        // console.log((end || "null").toString());
        if (end < globalStart) {
            // console.log("breaking");
            // console.log();
            // console.log();
            // console.log();
            // console.log();
            continue;
        }

        schedule = new Schedule(this.schedules[i], this.habits || {});
        // console.log("calling generate from %s to %s", start.toString(), end.toString());
        s = schedule.generate(start, end, patient.habits, this.numDoses(patient), userId, moreSchedules);
        // console.log();
        // console.log();
        // console.log();
        // console.log();
        schedules.push(s);
    }

    // there may be no schedule results because all schedules were created after the date
    // range specified. in that case, just use the first schedule version present
    if (schedules.length === 0) {
        schedule = new Schedule(this.schedules[0], this.habits || {});
        s = schedule.generate(globalStart, globalEnd, patient.habits,
                                  this.numDoses(patient), userId, moreSchedules);
        schedules.push(s);
    }

    // flatten results
    var events = schedules.reduce(function (scheduleA, scheduleB) {
        return scheduleA.concat(scheduleB);
    }, []);

    // order schedule
    events = events.sort(function (itemA, itemB) {
        var timeA = moment(itemA.date);
        var timeB = moment(itemB.date);

        if (timeA.isBefore(timeB)) return -1;
        else if (timeB.isBefore(timeA)) return 1;
        else return 0;
    });

    return events;
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

// virtual getter for Schedule object (whose raw data is stored in a versioned manner
// in schedules)
MedicationSchema.virtual("schedule").get(function () {
    // if schedule has already been parsed, (by setting .schedule = or by getting .schedule
    // already), return it
    if (typeof this.parsedSchedule !== "undefined") return this.parsedSchedule;

    // otherwise parse the most recent schedule (the last item in schedules), store it (for
    // future calls) and return it
    // if it's undefined, send null instead
    var rawSchedule = this.schedules[this.schedules.length - 1];
    if (typeof rawSchedule === "undefined") rawSchedule = null;
    this.parsedSchedule = new Schedule(rawSchedule, this.habits || {});
    return this.parsedSchedule;
}).set(function (rawSchedule) {
    // if this schedule is different to the previous one (ignoring dates) then store it as a new
    // version, otherwise don't change anything
    var oldSchedule = extend(this.schedules[this.schedules.length - 1], {});
    if (typeof oldSchedule === "undefined") oldSchedule = {};
    var newSchedule = extend(rawSchedule, {});
    delete oldSchedule.date;
    delete newSchedule.date;
    // remove IDs from times before comparing as well
    if (typeof oldSchedule.times === "object" &&
        oldSchedule.times !== null &&
        oldSchedule.times.constructor === Array) {
            oldSchedule.times = oldSchedule.times.map(function (time) {
                time = extend(time, {}); // copy
                delete time.id;
                delete time._id;
                return time;
            });
    }
    if (typeof newSchedule.times === "object" &&
        newSchedule.times !== null &&
        newSchedule.times.constructor === Array) {
            newSchedule.times = newSchedule.times.map(function (time) {
                time = extend(time, {}); // copy
                delete time.id;
                delete time._id;
                return time;
            });
    }

    if (!deepEqual(oldSchedule, newSchedule)) {
        // add current date to new schedule
        if (typeof rawSchedule === "object" && rawSchedule !== null) {
            rawSchedule.date = Date.now();
        }

        // add IDs to new schedule
        // use simple incrementing ID starting from 0 to generate time IDs
        // can start from 0 each time as time IDs are medication specific
        var times = rawSchedule.times;
        if (typeof times !== "undefined" && times !== null) {
            for (var i = 0; i < times.length; i++) {
                var time = times[i];

                // don't replace existing IDs
                if (typeof time._id === "number") continue;

                time._id = i;
                time.id = i;
                times[i] = time;
            }
            rawSchedule.times = times;
        }

        // save new schedule to schedules
        this.schedules.push(rawSchedule);
        this.markModified("schedules");

        // make sure parsedSchedule is recalculated (prevents .schedule from caching the old schedule)
        this.parsedSchedule = undefined;
    }
});

// return the schedule that should be used for a specific dose (the one with the dose's date in the
// active date range for the schedule)
MedicationSchema.methods.scheduleFor = function (dose) {
    if (typeof dose.date === "undefined" || dose.date === null) return this.schedule;

    // index of the first schedule with date > dose date
    var firstInvalid = -1;
    for (var i = 0; i < this.schedules.length; i++) {
        if (this.schedules[i] === null) continue;
        var date = new Date(this.schedules[i].date);
        if (date > dose.date) {
            firstInvalid = i;
            break;
        }
    }

    var schedule;
    if (firstInvalid === -1) {
        // return last schedule
        schedule = this.schedules[this.schedules.length - 1];
    } else if (firstInvalid === 0) {
        // return first schedule
        schedule = this.schedules[0];
    } else {
        // return relevant schedule
        schedule = this.schedules[firstInvalid - 1];
    }

    return new Schedule(schedule, this.habits || {});
};

// wrapper function around schedule.match
MedicationSchema.methods.match = function (doses, habits, callback) {
    var sm = new ScheduleMatcher();
    sm.match(this, doses, habits, callback);
};

// if no schedule is set, store an empty schedule
MedicationSchema.pre("save", function (next) {
    if (typeof this.schedules !== "undefined" && this.schedules !== null && this.schedules.length === 0) {
        this.schedules = [{}];
    }
    next();
});

// format notification settings as they should be for /medications/:id/times/:id endpoints
var formatNotificationSettings = function (time, user) {
    // time.notifications.default should always exist and be numeric or "paused"
    var notifications = time.notifications;
    if (typeof notifications !== "object" || notifications === null) notifications = {};
    var defaultOffset = notifications.default;
    if (typeof defaultOffset !== "number" && defaultOffset !== "paused") defaultOffset = 30;

    // user offset should default to "default"
    var userOffset = notifications[user._id];
    if (typeof userOffset !== "number" && userOffset !== "paused") userOffset = "default";

    return {
        default: defaultOffset,
        user: userOffset
    };
};

// find the notification settings for a specific time and user
MedicationSchema.methods.findNotificationSettings = function (rawTimeId, user, callback) {
    // check we have a medication schedule containing times
    var times = this.schedule.times;
    if (typeof times === "undefined" || times === null || times.constructor !== Array)
        return callback(errors.INVALID_TIME_ID);

    // attempt to parse timeId from a string into an int
    var timeId = ~~Number(rawTimeId); // ~~ truncates fractional parts
    if (String(timeId) !== String(rawTimeId) || timeId < 0)
        return callback(errors.INVALID_TIME_ID);

    // find time
    var time = times.filter(function (t) {
        return t._id === timeId;
    })[0];
    if (typeof time === "undefined" || time === null) return callback(errors.INVALID_TIME_ID);

    callback(null, formatNotificationSettings(time, user));
};

MedicationSchema.methods.toSummary = function (sep) {
    if (typeof this.brand === "string" && this.brand.length > 0 &&
        typeof this.name === "string" && this.name.length > 0)
        return util.format("%s%s%s", this.brand, sep, this.name);
    else
        return util.format("%s%s", this.brand, this.name);
};

// update the notification settings for a specific time and user
MedicationSchema.methods.updateNotificationSettings = function (rawTimeId, user, data, callback) {
    // check we have a medication schedule containing times
    var times = this.schedule.times;
    if (typeof times === "undefined" || times === null || times.constructor !== Array)
        return callback(errors.INVALID_TIME_ID);

    // attempt to parse timeId from a string into an int
    var timeId = ~~Number(rawTimeId); // ~~ truncates fractional parts
    if (String(timeId) !== String(rawTimeId) || timeId < 0)
        return callback(errors.INVALID_TIME_ID);

    // validate input data
    if (typeof data.default !== "undefined") {
        if ((typeof data.default !== "number" && data.default !== "paused") || data.default < 0)
            return callback(errors.INVALID_DEFAULT);
    }
    if (typeof data.user !== "undefined") {
        if (typeof data.user === "number") {
            if (data.user < 0) return callback(errors.INVALID_USER);
        } else if (data.user !== "default" && data.user !== "paused") {
            return callback(errors.INVALID_USER);
        }
    }

    // this.schedule is a virtual so we copy it, update it, and then save it again
    var schedule = this.schedule.toObject();
    var time; // time with the correct ID

    schedule.times = times.map(function (t) {
        if (t._id === timeId) {
            time = t;

            // update notifications object if it already exists, otherwise
            // create a new one
            if (typeof t.notifications !== "object" || t.notifications === null)
                t.notifications = {};

            // update default
            if (typeof data.default !== "undefined") t.notifications.default = data.default;

            // update user, hashing by ID
            if (typeof data.user !== "undefined") t.notifications[user._id] = data.user;
        }

        return t;
    });
    if (typeof time === "undefined" || time === null) return callback(errors.INVALID_TIME_ID);
    this.schedule = schedule;

    // save parent (see mongoose issue #2210)
    this.parent().update({
        medications: this.parent().medications
    }, function (err) {
        if (err) return callback(err);
        callback(null, formatNotificationSettings(time, user));
    });
};

// use null values to reset optional fields
MedicationSchema.pre("save", function (next) {
    if (this.rxNorm === null) this.rxNorm = "";
    if (this.notes === null) this.notes = "";
    if (this.rxNumber === null) this.rxNumber = "";
    if (this.ndc === null) this.ndc = "";
    if (this.dose === null) this.dose.quantity = 1;
    if (this.route === null) this.route = "";
    if (this.form === null) this.form = "";
    if (this.quantity === null) this.quantity = 1;
    if (this.type === null) this.type = "";
    if (this.brand === null) this.brand = "";
    if (this.origin === null) this.origin = "";
    next();
});
