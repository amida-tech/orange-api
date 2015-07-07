"use strict";
var moment          = require("moment-timezone"),
    numbers         = require("./helpers/numbers.js"),
    ScheduleMatcher = require("./helpers/schedule_matcher.js");

// parse and validate a schedule
var Schedule = module.exports = function (data) {
    // allow null
    if (data === null) data = {};
    // reject non-object types
    if (typeof data !== "object") return this;

    // default to false
    this.asNeeded = data.as_needed;
    this.regularly = data.regularly;
    if (this.asNeeded !== true) this.asNeeded = false;
    if (this.regularly !== true) this.regularly = false;

    // empty or null schedules default to as needed
    if (Object.keys(data).length === 0) this.asNeeded = true;

    // parse data for a regular schedule
    if (this.regularly) {
        // for how long
        this.until = data.until;

        // how often
        this.frequency = data.frequency;

        // times to take the meds on each day they should be taken
        this.times = data.times;

        // whether to take with food
        this.takeWithFood = data.take_with_food;

        // medications to take with
        this.takeWith = data.take_with_medications;
        this.takeWithout = data.take_without_medications;
    }
};

// validate
Schedule.prototype.isValid = function () {
    // at least one of asNeeded or regularly must be true
    if (this.asNeeded !== true && this.regularly !== true) return false;

    // validate data needed for a regular schedule
    if (this.regularly) {
        // validate when to stop
        // need one of the following formats:
        //   until: { type: "forever" }
        //   until: { type: "number", stop: 5 }
        //   until: { type: "date", stop: "2015-07-07" }
        if (typeof this.until !== "object") return false;
        if (this.until.type === "forever") {
            // nothing else needed here
        } else if (this.until.type === "number") {
            // require until.stop to be a positive integer
            if (!(numbers.isNatural(this.until.stop))) return false;
        } else if (this.until.type === "date") {
            // require until.stop to be a YYYY-MM-DD date
            // (timezone irrelevant for validity)
            var date = moment.utc(this.until.stop, "YYYY-MM-DD");
            if (!date.isValid()) return false;
        } else {
            // invalid until type
            return false;
        }

        // validate frequency
        // e.g., { n: 1, unit: "day", exclude: { exclude: [5, 6], repeat: 7 } }
        // ( exclude optional )
        if (typeof this.frequency !== "object") return false;
        // n should be a positive integer
        if (!(numbers.isNatural(this.frequency.n))) return false;
        // unit should be day, month or year
        if (["day", "month", "year"].indexOf(this.frequency.unit) < 0) return false;
        // exclude should either be null/not present
        if (typeof this.frequency.exclude !== "undefined" && this.frequency.exclude !== null) {
            // or be an object containing exclude and repeat
            var exclude = this.frequency.exclude;
            if (typeof exclude !== "object") return false;

            // default values for empty and null exclude
            if (exclude === null || Object.keys(exclude).length === 0)
                exclude = { exclude: [], repeat: 1 };

            // exclude should be an array of positive integers
            if (typeof exclude.exclude === "undefined" || exclude.exclude === null || exclude.exclude.constructor !== Array)
                return false;
            var anyInvalid = exclude.exclude.some(function (item) {
                // explicitly allow 0
                return !numbers.isNatural(item) && item !== 0;
            });
            if (anyInvalid) return false;

            // repeat should be a positive integer
            if (!(numbers.isNatural(exclude.repeat))) return false;
        }
        // start date should either be null/not present, or a valid YYYY-MM-DD date
        if (typeof this.frequency.start !== "undefined" && this.frequency.start !== null) {
            date = moment.utc(this.frequency.start, "YYYY-MM-DD");
            if (!date.isValid()) return false;
        }

        // takeWithFood should be true (with), false (without) or null (doesn't matter)
        if (this.takeWithFood !== true && this.takeWithFood !== false && this.takeWithFood !== null)
            return false;

        // takeWith and takeWithout should be arrays of integers (zero or positive), but are optional
        if (typeof this.takeWith !== "undefined" && this.takeWith !== null) {
            if (this.takeWith.constructor !== Array) return false;
            anyInvalid = this.takeWith.some(function (item) {
                // explicitly allow 0
                return !numbers.isNatural(item) && item !== 0;
            });
            if (anyInvalid) return false;
        }
        if (typeof this.takeWithout !== "undefined" && this.takeWithout !== null) {
            if (this.takeWithout.constructor !== Array) return false;
            anyInvalid = this.takeWithout.some(function (item) {
                // explicitly allow 0
                return !numbers.isNatural(item) && item !== 0;
            });
            if (anyInvalid) return false;
        }

        // validate times med is taken at
        // must be an array
        if (typeof this.times === "undefined" || this.times === null || this.times.constructor !== Array) return false;
        anyInvalid = this.times.some(function(item) {
            // must be an object
            if (typeof item !== "object" || item === null) return true;

            // type must be event, exact or unspecified
            if (item.type === "event") {
                // event must be one of breakfast/lunch/dinner/sleep
                if (["breakfast", "lunch", "dinner", "sleep"].indexOf(item.event) < 0) return true;
                // when must be one of before/after
                if (["before", "after"].indexOf(item.when) < 0) return true;
            } else if (item.type === "exact") {
                // requires a HH:MM time field
                var time = moment.utc(item.time, "HH:mm");
                if (!(time.isValid())) return true;
            } else if (item.type === "unspecified") {
                // nothing else needed
            } else {
                return true;
            }
        });
        if (anyInvalid) return false;

    }

    // if nothing failed, the schedule is valid
    return true;
};

// generate the actual times of the day each scheduled event occurs at
Schedule.prototype.prepareForMatching = function (habits) {
    var times = this.times.map(function (item) {
        // calculate times for events
        if (item.type === "event") {
            // calculate when event takes place
            var eventTime = moment(habits[item.event], "HH:mm");
            // arbitrary small delta here because the delta itself is less relevant
            // than distinguishing between before/after
            if (item.when === "before") eventTime.subtract(15, "minutes");
            else eventTime.add(15, "minutes");
            item.time = eventTime.format("HH:mm");
        }

        return item;
    });

    return {
        as_needed: this.asNeeded,
        regularly: this.regularly,
        times: times
    };
};

// match up to dose events (using ScheduleMatcher which in turn is just a simple wrapper
// around schedule_matcher.py)
Schedule.prototype.match = function (doses, client, habits, callback) {
    var sm = new ScheduleMatcher(client);
    sm.match(this.prepareForMatching(habits), doses, habits, callback);
};
