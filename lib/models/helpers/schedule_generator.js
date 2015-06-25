"use strict";
var moment      = require("moment"),
    extend      = require("xtend"),
    errors      = require("../../errors.js").ERRORS,
    TIME_REGEXP = require("./time.js").TIME_REGEXP;

// helper class to generate a machine-friendly medication schedule
// from one naively parsed from a user-entered schedule (see schedule_parser.js)
var ScheduleGenerator = module.exports = function () {};

// given a day and an HH:MM time, create a datetime at that day at that time
var createDatetime = function (date, time, tz) {
    date = moment.tz(date, tz); // don't modify original
    var timeMatch = TIME_REGEXP.exec(time);

    date.hours(timeMatch[1]);
    date.minutes(timeMatch[2]);

    return date;
};

// output formatters for the two types of schedule
var dayEvent = function (date, data) {
    return extend(data, {
        type: "date",
        date: date.format("YYYY-MM-DD")
    });
};
var timeEvent = function (date, data) {
    date.seconds(0);
    date.milliseconds(0);

    return extend(data, {
        type: "time",
        date: date.toISOString()
    });
};

// schedule is an input schedule as described above (already parsed by ScheduleParser)
// start and end are YYYY-MM-DD formatted
// habits is a patient habits object
// we perform little sanity checking as ScheduleParser has already validated most things
ScheduleGenerator.prototype.generate = function (schedule, start, end, habits) {
    this.schedule = schedule;
    this.habits = habits;
    this.tz = habits.tz || "Etc/UTC";
    this.output = [];
    // loop every 1 days by default (set by generateRegularly)
    this.frequency = 1;

    if (!this.validateParseDates(start, end)) {
        // don't parse any further, but don't return an error
        return this.output;
    }

    // ignore null or blank input schedules
    if (typeof this.schedule === "undefined" || this.schedule === null) return this.output;
    if (Object.keys(this.schedule).length === 0) return this.output;

    // generator we should use for each day of schedule
    var generator = function () {};
    if (this.schedule.type === "as_needed") generator = this.generateAsNeeded();
    else if (this.schedule.type === "regularly") generator = this.generateRegularly();

    // loop over every day in range
    for (var date = this.start; !this.end.isBefore(date); date.add(this.frequency, "days")) {
        // generate schedule for day
        // if a list, concatenate to output, otherwise just push to the end
        var output = generator.bind(this)(date);

        // ignore failed output (for things like e.g., unsupported schedule types)
        // should never occur
        if (typeof output === "undefined" || output === null) continue;

        if (output.constructor === Array) this.output.push.apply(this.output, output);
        else this.output.push(output);
    }

    return this.output;
};

ScheduleGenerator.prototype.validateParseDates = function (startRaw, endRaw) {
    // validate and parse start and end date
    var start = moment.tz(startRaw, "YYYY-MM-DD", this.tz);
    var end = moment.tz(endRaw, "YYYY-MM-DD", this.tz);
    if (!start.isValid()) throw errors.INVALID_START_DATE;
    if (!end.isValid()) throw errors.INVALID_END_DATE;

    // check start date is before end date
    if (end < start) throw errors.INVALID_END_DATE;

    // we should stop by stop_date
    if (typeof this.schedule.stopDate !== "undefined") {
        var stop = moment.tz(this.schedule.stopDate, "YYYY-MM-DD", this.tz); // previously validated

        // no results, but don't return an error
        if (stop.isBefore(start)) return false;
        // stop by then
        if (stop.isBefore(end)) end = stop;
    }

    this.start = start;
    this.end = end;

    // no errors
    return true;
};

// generate for an as_needed schedule
// e.g., { type: "as_needed" }
// e.g., { type: "as_needed", not_to_exceed: 7 }
ScheduleGenerator.prototype.generateAsNeeded = function () {
    // return as_needed as a maximum field if present
    var params = {};
    if (typeof this.schedule.notToExceed !== "undefined") params.maximum = this.schedule.notToExceed;

    return function (day) {
        return dayEvent(day, params);
    };
};

ScheduleGenerator.prototype.generateRegularly = function () {
    // the frequency with which user should take meds
    // TODO: for now we assume start is one of these days; is that the right choice?
    this.frequency = this.schedule.frequency;

    // delegate to the various different types
    if (typeof this.schedule.numberOfTimes !== "undefined" && this.schedule.numberOfTimes !== null) {
        return this.generateNumberOfTimes();
    } else if (typeof this.schedule.timesOfDay !== "undefined" && this.schedule.timesOfDay !== null) {
        return this.generateTimesOfDay();
    } else if (typeof this.schedule.interval !== "undefined" && this.schedule.interval !== null) {
        return this.generateInterval();
    } else {
        return function () {};
    }
};

// generator for a regular schedule with number_of_times present
// e.g., { type: "regularly", frequency: 3, number_of_times: 3 }
ScheduleGenerator.prototype.generateNumberOfTimes = function () {
    // must take exactly this many times
    var params = { exactly: this.schedule.numberOfTimes };

    return function (day) {
        return dayEvent(day, params);
    };
};

// check if patient sleep time is after midnight
var patientSleepsLate = function (wake, sleep) {
    return (typeof wake !== "undefined" && typeof sleep !== "undefined" &&
            wake !== null && sleep !== null &&
            moment(sleep, "HH:MM").isBefore(moment(wake, "HH:MM"))); // timezones irrelevant for relativity
};

// generator for a regular schedule with times_of_day present
// e.g., { type: "regularly", frequency: 3, times_of_day: ["09:00", "before_sleep"] }
ScheduleGenerator.prototype.generateTimesOfDay = function () {
    // parse times into slugs and real times
    // for efficiency do this here as opposed to in the daily loop
    var slugs = [];
    var times = [];

    this.schedule.timesOfDay.forEach(function (time) {
        var slugMatch = /^(before|after)_([\w_]*)$/.exec(time);
        if (slugMatch) {
            // it's a slug
            slugs.push({
                chronology: slugMatch[1],
                eventSlug: slugMatch[2]
            });
        } else {
            // it's an HH:MM time
            times.push(time);
        }
    });

    return function (day) {
        var events = [];
        var habits = this.habits;
        var tz = this.tz;

        // times are simple: we just combine them with the day to produce a datetime
        events.push.apply(events, times.map(function (time) {
            // these are stored in UTC time so they shift when patient timezone
            // changes
            var result = moment.tz(day, tz);
            result.utc();
            result.hours(time[0]);
            result.minutes(time[1]);
            return result;
        }));

        // slugs need a little more logic
        events.push.apply(events, slugs.map(function (datum) {
            if (datum.eventSlug === "sleep") {
                // sleep is a special case because we have habits for start and bed
                if (datum.chronology === "before") {
                    // this may be the next day
                    // that's the case iff the HH:MM for sleeping is before the HH:MM for waking
                    // (otherwise the night includes midnight as expected)
                    var eventTime = createDatetime(day, habits.sleep, tz);
                    if (patientSleepsLate(habits.wake, habits.sleep)) eventTime.add(1, "day");

                    return eventTime;
                } else {
                    return createDatetime(day, habits.wake, tz);
                }
            } else {
                // otherwise we just assume the event (meal) takes 15 minutes (or at least
                // that's a good time to notify the user)
                /*eslint-disable no-redeclare */ // eslint bug?
                var eventTime = createDatetime(day, habits[datum.eventSlug], tz);
                if (datum.chronology === "after") eventTime.add(15, "minutes");
                return eventTime;
                /*eslint-enable no-redeclare */
            }
        }));

        // return concatenation of both, after sorting
        return events.sort(function (timeA, timeB) {
            if (timeA.isBefore(timeB)) return -1;
            else if (timeB.isBefore(timeA)) return 1;
            else return 0;
        }).map(timeEvent);
    };
};

// generator for a regular schedule with interval present
// e.g., { type: "regularly", frequency: 3, interval: 480 }
ScheduleGenerator.prototype.generateInterval = function () {
    // time to start each interval cycle from: patient's wake time, defaulting to 0800
    var cycleStart = this.habits.wake || "08:00";
    // time to stop each interval cycle from: patient's sleep time, defaulting to midnight
    var cycleEnd = this.habits.sleep || "00:00";

    return function (day) {
        // turn cycleStart and cycleEnd into real datetimes
        var start = createDatetime(day, cycleStart, this.tz);
        var end = createDatetime(day, cycleEnd, this.tz);
        // if user goes to sleep after midnight, end our cycle on the next day
        if (patientSleepsLate(cycleStart, cycleEnd)) end.add(1, "day");

        var events = [];
        var time = start;
        do {
            events.push(moment(time)); // clone as add modifies in place
            time.add(this.schedule.interval, "minutes");
        } while (!end.isBefore(time));

        return events.map(timeEvent);
    };
};
