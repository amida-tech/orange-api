"use strict";
var moment      = require("moment-timezone"),
    util        = require("util"),
    inflector   = require("inflected"),
    extend      = require("xtend");

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

    // store date if present
    this.date = data.date;
    if (typeof this.date === "undefined" || this.date === null) this.date = Date.now();
    else this.date = new Date(this.date);

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
                    var time = moment.tz(event.time, "hh:mm a", tz);
                    time.utc();
                    event.time = time.format("hh:mm a");
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

// output schedule in a human-readable summary form
Schedule.prototype.toSummary = function (start, end, tz, extra, regularOnly) {
    if (typeof tz !== "string" || tz.length === 0) tz = "Etc/UTC";

    var summaries = [];
    if (this.regularly) {
        var summary = "";
        var freq = this.frequency;

        // default catch-all
        summary = util.format("Every %d %ss", freq.n, freq.unit);

        // if n=1
        // unit is one of: day, month, year
        if (freq.n === 1) {
            if (freq.unit === "day") summary = "Daily";
            else {
                summary = util.format("%sly", freq.unit);
            }
        } else if (freq.n === 3 && freq.unit === "month") summary = "Quarterly";
        else if (freq.n === 12 && freq.unit === "month") summary = "Yearly";
        else if (freq.n === 7 && freq.unit === "day") summary = "Weekly";
        else if (freq.n === 14 && freq.unit === "day") summary = "Fortnightly";

        var additionalInfo = "";
        // if we have exclusions
        var hasExcludes = typeof freq.exclude !== "undefined" &&
                          freq.exclude !== null &&
                          freq.exclude.exclude.length > 0;
        if (hasExcludes) {
            // except every 5, 6
            additionalInfo += " except every ";
            // get the ordinal suffix for a number: 1 => 1st, 2 => 2nd, 3 => 3rd etc
            // we 0 index so add 1 first
            var indices = freq.exclude.exclude.map(function (index) {
                return inflector.ordinalize(index + 1);
            });
            // combine with commas and and
            if (indices.length === 1) additionalInfo += indices[0];
            else {
                // all except last
                additionalInfo += indices.slice(0, -1).join(", ");
                additionalInfo += util.format(" and %s", indices[indices.length - 1]);
            }

            // days in a
            additionalInfo += util.format(" %s in a ", freq.unit);

            // n-unit cycle
            var cycle = util.format("%d-%s cycle", freq.exclude.repeat, freq.unit);
            // but specific cases, e.g., 12-month cycle => year
            if (freq.unit === "month") {
                if (freq.exclude.repeat === 12) cycle = "year";
                else if (freq.exclude.repeat === 3) cycle = "quarter";
            } else if (freq.unit === "day") {
                if (freq.exclude.repeat === 7) cycle = "week";
                else if (freq.exclude.repeat === 14) cycle = "fortnight";
            }
            additionalInfo += cycle;
        }

        // add the most recent cycle start, using the same logic as in generation.js
        // but not for daily meds
        additionalInfo += " (starting from ";
        this.cycleStarts.forEach(function(cycleStart) {
            cycleStart = moment.tz(cycleStart, "YYYY-MM-DD", tz).startOf("day");
            var increment = this.frequency.n;
            if (hasExcludes) increment *= freq.exclude.repeat;

            while (cycleStart.isBefore(start)) {
                cycleStart.add(increment, this.frequency.unit);
            }
            while (cycleStart.isAfter(start)) {
                cycleStart.subtract(increment, this.frequency.unit);
            }
            additionalInfo += cycleStart.format("M/D/YY");
        }.bind(this));
        additionalInfo += ")";

        // special case for daily medications
        if (freq.unit === "day" && freq.n === 1) {
            if (hasExcludes && freq.exclude.repeat === 7 && this.cycleStarts.length === 1) {
                var cycleStart = moment.tz(this.cycleStarts[0], "YYYY-MM-DD", tz).startOf("day");
                // special case for excludes on a weekly cycle
                // format output as e.g., Mon/Tues/Wed/Thurs/Fri
                var rawDays = [];
                for (var i = 0; i < freq.exclude.repeat; i++) {
                    if (freq.exclude.exclude.indexOf(i) >= 0) continue;
                    rawDays.push(i);
                }
                var days = rawDays.map(function (index) {
                    return moment(cycleStart).add(index, "days").format("ddd");
                });
                summary = days.join("/");
            } else if (hasExcludes) {
                // complicated excludes so we use the verbose output
                summary += additionalInfo;
            } else {
                // otherwise nothing beyond "daily" needed here
            }
        } else {
            summary += additionalInfo;
        }

        // until
        if (this.until.type === "number") summary += util.format(" for %d doses", this.until.stop);
        else if (this.until.type === "date") {
            var until = moment.tz(this.until.stop, "YYYY-MM-DD", tz);
            summary += util.format(" until %s", until.format("M/D/YY"));
        }

        // number of times scheduled
        if (extra !== false) {
            if (this.times.length === 1) summary += " - 1 event per day";
            else summary += util.format(" - %d events per day", this.times.length);
        }

        if (regularOnly === true) return summary;

        summaries.push(summary);
    }

    if (this.asNeeded) {
        if (regularOnly === true) return "As needed only";
        summaries.push("As needed");
    }

    return summaries;
};

// various schedule modules
require("./validation.js")(Schedule);
require("./matching.js")(Schedule);
require("./generation.js")(Schedule);
