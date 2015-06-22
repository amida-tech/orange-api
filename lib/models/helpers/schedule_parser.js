"use strict";
var moment      = require("moment-timezone"),
    numbers     = require("./numbers.js"),
    TIME_REGEXP = require("../../../lib/models/helpers/time.js").TIME_REGEXP,
    DATE_REGEXP = require("../../../lib/models/helpers/time.js").DATE_ONLY_REGEXP;

// helper class to validate and parse a medication schedule
// #parse validates and returns a valid schedule (or false if invalid)
// #validate just validates and returns true or false
var ScheduleParser = module.exports = function () {};

// parsed schedule or false
ScheduleParser.prototype.parse = function (schedule, habits) {
    // validate() parses everything into this.parsed for us
    return this.validate(schedule, habits) && this.parsed;
};

// true or false value
ScheduleParser.prototype.validate = function (schedule, habits) {
    this.schedule = schedule;
    this.tz = habits.tz || "Etc/UTC";
    this.parsed = {};

    // allow null schedules that get parsed into an empty
    // object (for default values)
    if (this.schedule === null) {
        return true;
    }

    // parse stop_date if present
    // check stop_date is formatted YYYY-MM-DD
    var stop = this.schedule.stop_date;
    if (typeof stop !== "undefined") {
        if (typeof stop !== "string") return false;
        // check valid by regex
        if (!DATE_REGEXP.exec(stop)) return false;

        // store
        this.parsed.stopDate = stop;
    }

    // delegate based on type field, failing if not a valid type
    // store schedule type
    this.parsed.type = this.schedule.type;
    if (this.schedule.type === "as_needed")
        return this.validateAsNeeded();
    else if (this.schedule.type === "regularly")
        return this.validateRegularly();
    else
        return false;
};

// { type: "as_needed" }
// { type: "as_needed", limit: 3 }
ScheduleParser.prototype.validateAsNeeded = function () {
    // check not_to_exceed is a natural number if present
    var limit = this.schedule.not_to_exceed;
    if (typeof limit !== "undefined") {
        if (!numbers.isNatural(limit)) return false;

        // store
        this.parsed.notToExceed = limit;
    }

    return true;
};

// { type: "regularly", frequency: 3, ... }
ScheduleParser.prototype.validateRegularly = function () {
    // require a natural number frequency to be present
    if (!numbers.isNatural(this.schedule.frequency)) return false;
    this.parsed.frequency = this.schedule.frequency;

    // delegate based on presence of various keys, but
    // also ensure only one is present
    var validators = {
        number_of_times: this.validateNumberOfTimes,
        times_of_day: this.validateTimesOfDay,
        interval: this.validateInterval
    };
    var matchedKeys = Object.keys(validators).filter(function (key) {
        return (key in this.schedule);
    }.bind(this));
    // should match exactly one key
    if (matchedKeys.length !== 1) return false;

    // delegate to the matched validator
    return validators[matchedKeys[0]].bind(this)();
};

// { type: "regularly", frequency: 3, times_of_day: ["before_sleep", "20:00"] }
ScheduleParser.prototype.validateTimesOfDay = function () {
    // we should have a times_of_day key that's an array containing valid
    // times (or slugs)
    var times = this.schedule.times_of_day;
    if (times.constructor !== Array) return false;

    // require at least one time
    if (times.length === 0) return false;

    // validate each time
    if (!(times.every(this.validateTime))) return false;

    this.parsed.timesOfDay = times.map(this.parseTime.bind(this));
    return true;
};

ScheduleParser.prototype.validateTime = function (time) {
    // list of allowed slug parts (X => before_X and after_X)
    var allowedSlugParts = ["sleep", "breakfast", "lunch", "dinner"];
    // check if time is a valid slug
    for (var i = 0; i < allowedSlugParts.length; i++) {
        var beforeSlug = "before_" + allowedSlugParts[i];
        var afterSlug = "after_" + allowedSlugParts[i];

        if (time === beforeSlug || time === afterSlug) return true;
    }

    // otherwise check if it matches the HH:MM regex
    return (!!TIME_REGEXP.exec(time));
};

// parse HH:MM times into UTC time (so when timezone is updated we
// can shift these modulo local time)
// store as HH:MM in UTC time
ScheduleParser.prototype.parseTime = function (time) {
    var match = TIME_REGEXP.exec(time);
    if (match) {
        var m = moment.tz(this.tz);
        m.local();
        m.hours(match[1]);
        m.minutes(match[2]);
        m.utc();
        return [m.hours(), m.minutes()];
    } else {
        // (before|after)_X
        return time;
    }
};

// { type: "regularly", frequency: 3, number_of_times: 5 }
ScheduleParser.prototype.validateNumberOfTimes = function () {
    // we should have a number_of_times key that's a natural number
    if (!numbers.isNatural(this.schedule.number_of_times)) return false;

    this.parsed.numberOfTimes = this.schedule.number_of_times;
    return true;
};

// { type: "regularly", frequency: 3, interval: 360 }
ScheduleParser.prototype.validateInterval = function () {
    // we should have an interval key that's a natural number
    if (!numbers.isNatural(this.schedule.interval)) return false;

    this.parsed.interval = this.schedule.interval;
    return true;
};

// format a parsed schedule for API output (converts times back to strings and
// camel case back to snake case
ScheduleParser.prototype.format = function (parsed, habits) {
    if (typeof parsed === "undefined" || parsed === null) parsed = this.parsed;
    if (!habits) habits = {};
    this.tz = habits.tz || this.tz || "Etc/UTC";

    // this.validate handles parsing for us
    var output = {};

    // camel case to snake case
    var mappings = {
        interval: "interval",
        numberOfTimes: "number_of_times",
        timesOfDay: "times_of_day",
        frequency: "frequency",
        notToExceed: "not_to_exceed",
        stopDate: "stop_date",
        type: "type"
    };
    for (var key in mappings) {
        if (key in parsed) output[mappings[key]] = parsed[key];
    }

    // format times_of_day: turn [h, m] into "HH:MM" and shift back to
    // the user's current timezone (as habits says)
    if ("times_of_day" in output) {
        output.times_of_day = output.times_of_day.map(function (time) {
            if (typeof time === "string") return time;

            var m = moment.tz(this.tz);
            m.utc();
            m.hours(time[0]);
            m.minutes(time[1]);
            m.local();
            return m.format("HH:mm");
        }.bind(this));
    }

    return output;
};
