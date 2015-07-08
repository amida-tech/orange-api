"use strict";
var moment      = require("moment-timezone"),
    errors      = require("../../errors.jS").ERRORS;

module.exports = function (Schedule) {
    // generate a list of events at which the user should take their
    // meds, between a start and end date (inclusive)
    Schedule.prototype.generate = function (startRaw, endRaw, habits) {
        // find timezone, using a sensible default
        var tz = habits.tz || "Etc/UTC";

        // set sensible defaults for habits
        if (typeof habits.wake === "undefined" || habits.wake === null) habits.wake = "07:00";
        if (typeof habits.breakfast === "undefined" || habits.breakfast === null) habits.breakfast = "08:00";
        if (typeof habits.lunch === "undefined" || habits.lunch === null) habits.lunch = "12:00";
        if (typeof habits.dinner === "undefined" || habits.dinner === null) habits.dinner = "19:00";
        if (typeof habits.sleep === "undefined" || habits.sleep === null) habits.sleep = "00:00";

        // check if patient sleeps before they wake up (changes logic slightly)
        var sleepsLate = moment(habits.sleep, "HH:MM").isBefore(moment(habits.wake, "HH:MM"));

        // parse start and end dates and check they're in YYYY-MM-DD format
        var start = moment.tz(startRaw, "YYYY-MM-DD", tz).startOf("day");
        var end = moment.tz(endRaw, "YYYY-MM-DD", tz).startOf("day");
        if (!start.isValid()) throw errors.INVALID_START_DATE;
        if (!end.isValid()) throw errors.INVALID_END_DATE;

        // check start date is before end date
        if (end < start) throw errors.INVALID_END_DATE;

        // if no regular schedule, nothing to return
        if (!this.regularly) return [];

        // loop over every unit in range
        // we increase this.frequency.n (e.g., 2) this.frequency.unit's (e.g., "day"s) at a time
        // (this.frequency.unit already sanitised so we can pass it straight into moment)
        // we start from start, but most respect cycleStart
        var cycleStart = moment.tz(this.cycleStart, "YYYY-MM-DD", tz).startOf('day');
        var startDifference = cycleStart.diff(start, this.frequency.unit);
        // make negative modulo behave as you'd expect
        start.add(((startDifference % this.frequency.n) + this.frequency.n) % this.frequency.n, this.frequency.unit);

        var events = [];

        for (var date = moment(start); !end.isBefore(date); date.add(this.frequency.n, this.frequency.unit)) {
            // handle the exclude key
            // index of date in the cycle, modulo repeat
            if (typeof this.frequency.exclude !== "undefined" && this.frequency.exclude !== null) {
                // negative modulo
                var index = date.diff(cycleStart, this.frequency.unit) % this.frequency.exclude.repeat;
                index = (index + this.frequency.exclude.repeat) % this.frequency.exclude.repeat;
                if (this.frequency.exclude.exclude.indexOf(index) >= 0) continue;
            }

            // iterate over each scheduled event item
            this.times.forEach(function (item) {
                var datum;

                if (item.type === "unspecified") {
                    // any time in the day
                    datum = {
                        type: "date",
                        date: date.format("YYYY-MM-DD", tz)
                    };
                } else if (item.type === "exact") {
                    // exact time of day, in UTC
                    // need to convert to local (exact times remain constant modulo UTC
                    // across timezone changes)
                    var eventDate = moment(date).utc();
                    // set UTC time
                    var eventTime = moment.utc(item.time, "HH:mm");
                    eventDate.hours(eventTime.hours());
                    eventDate.minutes(eventTime.minutes());

                    datum = {
                        type: "time",
                        date: eventDate.toISOString()
                    };
                } else if (item.type === "event") {
                    // otherwise an event (before breakfast etc)

                    // habit we need to look at. for breakfast/lunch/dinner,
                    // before/after makes no difference to the actual expected dose time
                    // (rather just the notification time)
                    var habit = item.event;
                    if (habit === "sleep" && item.when === "after") habit = "wake";
                    else if (habit === "sleep" && item.when === "before") habit = "sleep";

                    // find time the event occurs at (in HH:MM format)
                    var eventTime = moment.tz(habits[habit], "HH:mm", tz);

                    // set time on date
                    var eventDate = moment(date);
                    eventDate.hours(eventTime.hours());
                    eventDate.minutes(eventTime.minutes());
                    eventDate.seconds(0);
                    eventDate.milliseconds(0);

                    // add a day if it's the sleep event and the patient goes to bed late (after midnight)
                    if (sleepsLate && habit === "sleep") eventDate.add(1, "day")

                    datum = {
                        type: "time",
                        date: eventDate.toISOString()
                    };
                } else {
                    // unknown item type (should never happen as we validate elsewhere)
                    console.log("UNKNOWN ITEM", item);
                    return;
                }

                events.push(datum);
            });
        }

        // sort to return in ascending time order (showing date-only events at the end
        // of a date)
        return events.sort(function (eventA, eventB) {
            // endOf("day") pushes date-only events to the end of each day
            var timeA;
            if (eventA.type === "time") timeA = moment.tz(eventA.date, tz);
            else timeA = moment.tz(eventA.date, "YYYY-MM-DD", tz).endOf("day");

            var timeB;
            if (eventB.type === "time") timeB = moment.tz(eventB.date, tz);
            else timeB = moment.tz(eventB.date, "YYYY-MM-DD", tz).endOf("day");

            if (timeA.isBefore(timeB)) return -1;
            else if (timeB.isBefore(timeA)) return 1;
            else return 0;
        });
    };
};
