"use strict";
var moment  = require("moment-timezone"),
    extend  = require("xtend");

// parse and validate a schedule
var Schedule = module.exports = function (data, habits) {
    // allow null
    if (data === null) data = {};
    // reject non-object types
    if (typeof data !== "object") return this;

    // timezone
    var tz = "Etc/UTC";
    if (typeof habits !== "undefined" && habits !== null && typeof habits.tz === "string") tz = habits.tz;

    // default to false
    this.asNeeded = data.as_needed;
    this.regularly = data.regularly;
    if (typeof this.asNeeded === "undefined") this.asNeeded = false;
    if (typeof this.regularly === "undefined") this.regularly = false;

    // empty or null schedules default to as needed
    if (Object.keys(data).length === 0) this.asNeeded = true;

    // parse data for a regular schedule
    if (this.regularly) {
        // for how long
        this.until = data.until;

        // how often
        this.frequency = data.frequency;
        // a start date for one of the cycles, defaulting to today
        // stored as YYYY-MM-DD
        // array llowing multiple start dates (all are used)
        this.cycleStarts = moment().format("YYYY-MM-DD");
        if (typeof this.frequency !== "undefined" && this.frequency !== null &&
                typeof this.frequency.start !== "undefined" && this.frequency.start !== null) {
            this.cycleStarts = this.frequency.start;
        }
        if (typeof this.cycleStarts === "string") this.cycleStarts = [this.cycleStarts];

        // times to take the meds on each day they should be taken
        if (typeof data.times !== "undefined" && data.times !== null && data.times.constructor === Array) {
            this.times = data.times.map(function (event) {
                // convert exact times to UTC
                if (event.type === "exact") {
                    var time = moment.tz(event.time, "HH:mm", tz);
                    time.utc();
                    event.time = time.format("HH:mm");
                }
                return event;
            });
        } else {
            // handle invalid data: we haven't validated yet
            this.times = data.times;
        }

        // whether to take with food
        this.takeWithFood = data.take_with_food;

        // medications to take with
        this.takeWith = data.take_with_medications;
        this.takeWithout = data.take_without_medications;
    }
};

// output schedule in same format it was passed in
Schedule.prototype.toObject = function () {
    var MAPPINGS = {
        as_needed: "asNeeded",
        regularly: "regularly",
        until: "until",
        frequency: "frequency",
        times: "times",
        take_with_food: "takeWithFood",
        take_with_medications: "takeWith",
        take_without_medications: "takeWithout"
    };

    var data = {};
    for (var key in MAPPINGS) {
        var internalKey = MAPPINGS[key];
        // store data if it was there in original input
        if (typeof this[internalKey] !== "undefined") data[key] = this[internalKey];
    }

    // don't include notifications in output
    if (typeof data.times === "object" && data.times !== null && data.times.constructor === Array) {
        data.times = data.times.map(function (time) {
            // don't delete without cloning as we may be using the output of this
            time = extend(time, {});
            delete time.notifications;
            return time;
        });
    }

    return data;
};

// various schedule modules
require("./validation.js")(Schedule);
require("./matching.js")(Schedule);
require("./generation.js")(Schedule);
