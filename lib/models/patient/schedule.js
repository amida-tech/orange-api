"use strict";
var moment  = require("moment-timezone"),
    async   = require("async"),
    errors  = require("../../errors.js").ERRORS;

module.exports = function (PatientSchema) {
    // helper function to calculate mean average from an array of numbers
    var mean = function (nums) {
        var sum = nums.reduce(function (total, num) {
            return total + num;
        });
        return sum / nums.length;
    };

    // generate schedule from start date, end date, user (for authorization) and optional med ID
    PatientSchema.methods.generateSchedule = function (start, end, user, medicationId, userId, callback) {
        this.generateScheduleResults(start, end, user, medicationId, userId, function (err, results) {
            if (err) return callback(err);
            this.formatSchedule(results, callback);
        }.bind(this));
    };

    // generate raw schedule (no overall stats just individual results) for patient
    PatientSchema.methods.generateScheduleResults = function (start, end, user, medicationId, userId, callback) {
        // sensible defalut for timezone
        var tz = this.habits.tz || "Etc/UTC";
        // console.log(tz);
        // console.log(this._id);
        // ScheduleGenerator handles start and end date validation for us, but we set defaults
        // find today in the user's timezone
        var today = moment.tz(tz);

        // note that dates specified by the user are strings (which Schedule parses), but
        // we default to moment objects (which Schedule leaves alone)
        if (typeof start !== "string" || start.length === 0)
            start = moment.tz(today, tz).startOf("day"); // default to today
        else
            start = moment.tz(start, tz);
        if (typeof end !== "string" || end.length === 0)
            end = moment.tz(today, tz).add(6, "days").endOf("day"); // default to one week later
        else
            end = moment.tz(end, tz);

        // console.log("start");
        // console.log(start.format());
        // console.log(moment.tz(today, tz).startOf("day").format());
        // console.log("end");
        // console.log(end.format());
        // console.log(moment.tz(today, tz).add(6, "days").endOf("day").format());
        // console.log();

        // a list of medications we should generate the schedule for, defaulting to all
        var medications = this.medications;

        // only show medications that are active. filter here so that if a medication_id is explicitly
        // specified, we show schedule events for it even if it's a paused medication
        medications = medications.filter(function (medication) {
            return medication.status === "active";
        });

        // if an individual medication has been specified to generate for, check that exists and belongs
        // to this patient, and then use that
        if (typeof medicationId !== "undefined" && medicationId !== null && medicationId.length !== 0) {
            var medication = this.medications.id(medicationId);
            if (typeof medication === "undefined" || medication === null)
                return callback(errors.INVALID_RESOURCE_MEDICATION_ID);
            medications = [medication];
        }

        // only show medications the user has access to at the medication level
        medications = medications.filter(function (medication) {
            return medication.authorize("read", user, this) === null;
        }.bind(this));

        // generate schedule events
        async.map(medications, function (medication, done) {
            // generate schedule for when to take medication
            var events = medication.generateSchedule(start, end, this, userId);

            // find doses the user's taken in this time range for this medication
            var startFilter = moment.tz(start, "YYYY-MM-DD", tz).startOf("day");
            var endFilter = moment.tz(end, "YYYY-MM-DD", tz).endOf("day");
            var doses = this.doses.filter(function (dose) {
                // this medication only
                return dose.medicationId === medication._id;
            }).filter(function (dose) {
                // in date range
                var date = moment(dose.date);
                return !(date.isBefore(startFilter) || date.isAfter(endFilter));
            });

            // perform matching
            // the matcher only cares about the datetimes the doses were taken
            medication.match(doses, this.habits, function (err, result) {
                if (err) return done(err);

                var resultStart = moment.utc(result.start);

                // go through events, and add date 'indices' to them (number of days
                // since user woke up on the morning of their first dose)
                var wake = moment.tz(this.habits.wake || "09:00", "HH:mm a", tz);
                events = events.map(function (event) {
                    // calculate start of the event start date
                    // see python matcher for logic and comparison
                    var startDay = moment.tz(event.date, tz)
                                         .hours(wake.hours())
                                         .minutes(wake.minutes())
                                         .seconds(0)
                                         .milliseconds(0);
                    if (startDay.isAfter(moment.tz(event.date, tz))) startDay.subtract(1, "day");
                    event.day = startDay.diff(resultStart, "days");

                    return event;
                });

                // determine whether each event was in the future or past
                events = events.map(function (event) {
                    event.happened = moment.tz(event.date, tz).isBefore(moment());
                    return event;
                });

                // for each schedule event in the past, try and match it up with a dose event
                events = events.map(function (event) {
                    // store scheduled time ID
                    event.scheduled = event.index;

                    // must have the same day index and event index
                    var match = result.matches.filter(function (m) {
                        return m.match !== null && m.match.day === event.day && m.match.index === event.index;
                    })[0];

                    // if a dose was recorded at this schedule event
                    if (typeof match !== "undefined" && match !== null) {
                        // record dose ID regardless of whether dose was taken
                        event.dose_id = match.dose;

                        // calculate delay
                        // find dose object from ID
                        var dose = this.doses.id(match.dose);
                        if (dose.taken) {
                            // record delay only if medication was actually taken
                            event.delay = moment(dose.date).seconds(0).diff(moment(event.date), "minutes");
                            event.took_medication = true;
                        } else {
                            event.took_medication = false;
                        }
                    } else {
                        // only record took_medication if event was in the past
                        // (in this case where no dose object was matched)
                        if (event.happend) event.took_medication = false;
                    }

                    // delete surplus keys and add medication ID
                    delete event.index;
                    delete event.day;
                    event.medication_id = medication._id;

                    return event;
                }.bind(this));

                // add in events for doses that were recorded (either taken or not) but which don't correspond to
                // any scheduled event
                result.matches.filter(function (m) {
                    return m.match === null;
                }).forEach(function (match) {
                    var event = {};

                    // find dose object from ID
                    var dose = this.doses.id(match.dose);
                    if (typeof dose !== "undefined" && dose !== null) {
                        // add info from dose item
                        event.dose_id = match.dose;
                        event.type = "time";
                        event.date = dose.date;
                        event.took_medication = dose.taken;
                        event.happened = moment.tz(event.date, tz).isBefore(moment());

                        // add medication-wide info
                        event.take_with_food = medication.scheduleFor(dose).takeWithFood;
                        event.take_with_medications = medication.scheduleFor(dose).takeWith;
                        event.take_without_medications = medication.scheduleFor(dose).takeWithout;
                        event.medication_id = medication._id;

                        events.push(event);
                    }
                }.bind(this));

                // return data
                return done(null, events);
            }.bind(this));
        }.bind(this), callback);
    };

    // format schedule items for output (add stats)
    PatientSchema.methods.formatSchedule = PatientSchema.statics.formatSchedule = function (results, callback) {
        // flatten results into a schedule
        var schedule = results.reduce(function (scheduleA, scheduleB) {
            return scheduleA.concat(scheduleB);
        }, []);

        // order schedule
        schedule = schedule.sort(function (itemA, itemB) {
            var timeA = moment(itemA.date);
            var timeB = moment(itemB.date);

            if (timeA.isBefore(timeB)) return -1;
            else if (timeB.isBefore(timeA)) return 1;
            else return 0;
        });

        // generate schedule statistics
        var statistics = {};
        var pastEvents = schedule.filter(function (item) {
            // ignore extranaeous non-scheduled doses for calculating stats
            return item.happened && (typeof item.scheduled !== "undefined");
        });
        var medEvents = pastEvents.filter(function (item) {
            return item.took_medication;
        });

        // if the patient didn't take any meds, we can't generate any stats
        if (medEvents.length === 0) {
            statistics.took_medication = null;
            statistics.delay = null;
            statistics.delta = null;
        } else {
            // calculate percentage of past events for which the patient took their meds
            statistics.took_medication = 100 * medEvents.length / pastEvents.length;

            // calculate mean and absolute value of mean of all delays
            var delays = medEvents.map(function (item) {
                return item.delay;
            });
            var absDelays = delays.map(function (delay) {
                return Math.abs(delay);
            });
            statistics.delta = mean(delays);
            statistics.delay = mean(absDelays);
        }

        // return results
        return callback(null, {
            schedule: schedule,
            statistics: statistics
        });
    };
};
