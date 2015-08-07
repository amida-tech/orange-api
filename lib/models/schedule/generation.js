"use strict";
var moment      = require("moment-timezone"),
    numbers     = require("../helpers/numbers.js"),
    errors      = require("../../errors.js").ERRORS;

module.exports = function (Schedule) {
    // generate a list of events at which the user should take their
    // meds, between a start and end date (inclusive)
    Schedule.prototype.generate = function (startRaw, endRaw, habits, numberTaken, userId) {
        // find timezone, using a sensible default
        var tz = "Etc/UTC";
        if (typeof habits !== "undefined" && habits !== null && typeof habits.tz === "string") tz = habits.tz;

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

        var events = [];
        for (var j = 0; j < this.cycleStarts.length; j++) {
            // loop over every unit in range
            // we increase this.frequency.n (e.g., 2) this.frequency.unit's (e.g., "day"s) at a time
            // (this.frequency.unit already sanitised so we can pass it straight into moment)
            // we start from start, but must respect cycleStart
            // so we subtract n units from cycleStart until it's less than or equal to start
            // then we add n units to cycleStart until it's greater than or equal to start
            // TODO: do this mathematically without loops
            var cycleStart = moment.tz(this.cycleStarts[j], "YYYY-MM-DD", tz).startOf("day");
            //console.log("CF start", start.format("YYYY-MM-DD"));
            //console.log("INITIAL cycleStart", cycleStart.format("YYYY-MM-DD"));
            while (cycleStart.isAfter(start)) {
                cycleStart.subtract(this.frequency.n, this.frequency.unit);
            }
            //console.log("INTERMEDIATE cycleStart", cycleStart.format("YYYY-MM-DD"));
            while (cycleStart.isBefore(start)) {
                cycleStart.add(this.frequency.n, this.frequency.unit);
            }
            //console.log("FINAL cycleStart", cycleStart.format("YYYY-MM-DD"));

            for (var date = moment(cycleStart); !end.isBefore(date); date.add(this.frequency.n, this.frequency.unit)) {
                // handle the exclude key
                // index of date in the cycle, modulo repeat
                if (typeof this.frequency.exclude !== "undefined" && this.frequency.exclude !== null) {
                    // negative modulo
                    var index = date.diff(cycleStart, this.frequency.unit) % this.frequency.exclude.repeat;
                    index = (index + this.frequency.exclude.repeat) % this.frequency.exclude.repeat;
                    if (this.frequency.exclude.exclude.indexOf(index) >= 0) continue;
                }

                // iterate over each scheduled event item
                for (var i = 0; i < this.times.length; i++) {
                    var item = this.times[i];

                    // store time index (index in this.times) for matching up with doses
                    var datum = { index: i };

                    // retrieve number of minutes before the event the notification should
                    // be sent
                    var offset;
                    // if a user-specific time is set, use that
                    if (typeof item.notifications === "object" && item.notifications !== null) {
                        var userOffset = item.notifications[userId];
                        if (typeof userOffset === "number") {
                            offset = userOffset;
                        } else {
                            // otherwise use the default offset
                            offset = item.notifications.default;
                            // using a sensible default if that's not specified
                            if (typeof offset !== "number") offset = 30;
                        }
                    } else {
                        // use a sensible default if no notifications info available
                        offset = 30;
                    }

                    // store take_with_food, take_with/without_medications keys verbatim
                    datum.take_with_food = this.takeWithFood;
                    datum.take_with_medications = this.takeWith;
                    datum.take_without_medications = this.takeWithout;

                    var eventTime, eventDate;
                    if (item.type === "unspecified") {
                        // any time in the day
                        datum.type = "date";
                        datum.date = date.format("YYYY-MM-DD", tz);
                    } else if (item.type === "exact") {
                        // exact time of day, in UTC
                        // need to convert to local (exact times remain constant modulo UTC
                        // across timezone changes)
                        eventDate = moment(date).utc();
                        // set UTC time
                        eventTime = moment.utc(item.time, "HH:mm");
                        eventDate.hours(eventTime.hours());
                        eventDate.minutes(eventTime.minutes());

                        datum.type = "time";
                        datum.date = eventDate.toISOString();
                    } else if (item.type === "event") {
                        // otherwise an event (before breakfast etc)

                        // habit we need to look at. for breakfast/lunch/dinner,
                        // before/after makes no difference to the actual expected dose time
                        // (rather just the notification time)
                        var habit = item.event;
                        if (habit === "sleep" && item.when === "after") habit = "wake";
                        else if (habit === "sleep" && item.when === "before") habit = "sleep";

                        // find time the event occurs at (in HH:MM format)
                        eventTime = moment.tz(habits[habit], "HH:mm", tz);

                        // set time on date
                        eventDate = moment(date);
                        eventDate.hours(eventTime.hours());
                        eventDate.minutes(eventTime.minutes());
                        eventDate.seconds(0);
                        eventDate.milliseconds(0);

                        // add a day if it's the sleep event and the patient goes to bed late (after midnight)
                        if (sleepsLate && habit === "sleep") eventDate.add(1, "day");

                        datum.type = "time";
                        datum.date = eventDate.toISOString();
                    } else {
                        // unknown item type (should never happen as we validate elsewhere)
                        console.log("UNKNOWN ITEM", item);
                        continue;
                    }

                    // add notification time to datum
                    if (datum.type === "time")
                        datum.notification = moment(eventDate).subtract(offset, "minutes").toISOString();

                    events.push(datum);
                }
            }
        }

        // sort to return in ascending time order (showing date-only events at the end
        // of a date)
        events = events.sort(function (eventA, eventB) {
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

        // if a maximum number of doses is specified, respect that
        // relies upon the numberTaken parameter passed in: this should probably be a count
        // of dose events registered for that medication
        if (this.until.type === "number" && (numberTaken === 0 || numbers.isNatural(numberTaken))) {
            // saturate at 0
            var numberLeft = Math.max(this.until.stop - numberTaken, 0);
            events = events.slice(0, numberLeft);
        }

        // only show events taking place on or before the stop date (if one is specified)
        if (this.until.type === "date") {
            var stopDate = moment.tz(this.until.stop, "YYYY-MM-DD", tz).endOf("day");
            events = events.filter(function (event) {
                var time;
                if (event.type === "time") time = moment.tz(event.date, tz);
                else time = moment.tz(event.date, "YYYY-MM-DD", tz).endOf("day");
                return !time.isAfter(stopDate);
            });
        }

        return events;
    };
};
