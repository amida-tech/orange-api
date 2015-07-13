"use strict";
var chai        = require("chai"),
    moment      = require("moment-timezone"),
    extend      = require("xtend"),
    Schedule    = require("../../../lib/models/schedule/schedule.js"),
    errors      = require("../../../lib/errors.js").ERRORS;
var expect = chai.expect;

describe("Schedule", function () {
    describe("generates schedules correctly in a single timezone", function () {
        // generic method to promise to generate a schedule
        var gen = function (input, start, end, habits, numberTaken) {
            // format dates as YYYY-MM-DDD
            if (typeof start === "object") start = start.format("YYYY-MM-DD");
            if (typeof end === "object") end = end.format("YYYY-MM-DD");
            if (input && typeof input.frequency === "object" && typeof input.frequency.start === "object")
                input.frequency.start = input.frequency.start.format("YYYY-MM-DD");
            if (input && typeof input.until === "object" && typeof input.until.stop === "object")
                input.until.stop = input.until.stop.format("YYYY-MM-DD");

            // habits only needed when checking slugs
            if (typeof habits === "undefined") habits = {
                wake: null, sleep: null, breakfast: null, lunch: null, dinner: null
            };

            // create Schedule object and generate using it
            var schedule = new Schedule(input, habits);
            expect(schedule.isValid()).to.be.true;
            // filter out index keys that are only used internally in the app (and tested
            // in medication_schedule_generator_test.js)
            return schedule.generate(start, end, habits, numberTaken).map(function (item) {
                delete item.index;
                return item;
            });
        };
        // check the desired schedule is generated
        var check = function (inSchedule, start, end, desiredSchedule, habits, numberTaken) {
            expect(gen(inSchedule, start, end, habits, numberTaken)).to.deep.equal(desiredSchedule);
        };
        // check generateSchedule errors it with the relevant error
        var checkFails = function (inSchedule, start, end, error, habits, numberTaken) {
            expect(errors).to.include.keys(error);
            // chai throw assertions not working, so this hackish override
            expect(gen.bind(this, inSchedule, start, end, habits, numberTaken)).to.throw(Error);
            try {
                gen(inSchedule, start, end, habits);
            } catch (err) {
                expect(err).to.deep.equal(errors[error]);
            }
        };

        // helpers to get a datetime object given an HH:MM on a specific day
        var yesterday, today, tomorrow, weekAgo, weekFromNow, startOfWeek, endOfWeek, startOfYear, endOfYear;
        before(function () {
            // for testing we assume we're in a UTC timezone rather than having
            // to explicitly pass the system timezone
            today = moment.tz(moment().format("YYYY-MM-DD"), "YYYY-MM-DD", "Etc/UTC");
            yesterday = moment(today).subtract(1, "days");
            tomorrow = moment(today).add(1, "days");
            weekAgo = moment(today).subtract(7, "days");
            startOfWeek = moment(today).startOf("week");
            weekFromNow = moment(today).add(7, "days");
            endOfWeek = moment(today).endOf("week");
            startOfYear = moment(today).startOf("year");
            endOfYear = moment(today).endOf("year");
        });

        // helper to take a datetime and return the sort of event object
        // we expect
        // time in HH:MM
        var takeAt = function (date, time) {
            var parts = time.split(":", 2);
            date.hours(parts[0]);
            date.minutes(parts[1]);
            return {
                date: date.toISOString(),
                type: "time"
            };
        };
        // same but just for a date
        var takeOn = function (date) {
            var datum = {
                date: date.format("YYYY-MM-DD"),
                type: "date"
            };
            return datum;
        };

        // blank schedules
        it("handles null schedules", function () {
            return check(null, yesterday, tomorrow, []);
        });
        it("handles empty schedules", function () {
            return check({}, yesterday, tomorrow, []);
        });

        // date ranges
        it("handles an invalid start date", function () {
            return checkFails({
                regularly: true,
                as_needed: false,
                until: { type: "forever" },
                frequency: { n: 1, unit: "day" },
                times: [{ type: "unspecified" }],
                take_with_food: null,
                take_with_medications: [],
                take_without_medications: []
            }, "foo", tomorrow, "INVALID_START_DATE");
        });
        it("handles an invalid end date", function () {
            return checkFails({
                regularly: true,
                as_needed: false,
                until: { type: "forever" },
                frequency: { n: 1, unit: "day" },
                times: [{ type: "unspecified" }],
                take_with_food: null,
                take_with_medications: [],
                take_without_medications: []
            }, yesterday, "foo", "INVALID_END_DATE");
        });
        it("doesn't allow the start date to be after the end date", function () {
            return checkFails({
                regularly: true,
                as_needed: false,
                until: { type: "forever" },
                frequency: { n: 1, unit: "day" },
                times: [{ type: "unspecified" }],
                take_with_food: null,
                take_with_medications: [],
                take_without_medications: []
            }, tomorrow, yesterday, "INVALID_END_DATE");
        });
        it("allows the start date to equal the end date", function () {
            return check({
                regularly: true,
                as_needed: false,
                until: { type: "forever" },
                frequency: { n: 1, unit: "day" },
                times: [{ type: "exact", time: "09:00" }],
                take_with_food: null,
                take_with_medications: [],
                take_without_medications: []
            }, today, today, [
                takeAt(today, "09:00")
            ]);
        });

        describe("with type as_needed", function () {
            it("generates an empty schedule", function () {
                return check({
                    regularly: false,
                    as_needed: true
                }, yesterday, tomorrow, []);
            });
        });

        describe("with type regularly", function () {
            it("handles as_needed and regularly", function () {
                return check({
                    regularly: true,
                    as_needed: true,
                    until: { type: "forever" },
                    frequency: { n: 1, unit: "day" },
                    times: [{ type: "exact", time: "09:00" }],
                    take_with_food: null,
                    take_with_medications: [],
                    take_without_medications: []
                }, yesterday, tomorrow, [
                    takeAt(yesterday, "09:00"),
                    takeAt(today, "09:00"),
                    takeAt(tomorrow, "09:00")
                ]);
            });

            describe("'until' key", function () {
                it("handles forever", function () {
                    return check({
                        regularly: true,
                        as_needed: false,
                        until: { type: "forever" },
                        frequency: { n: 1, unit: "day" },
                        times: [{ type: "exact", time: "09:00" }],
                        take_with_food: null,
                        take_with_medications: [],
                        take_without_medications: []
                    }, yesterday, tomorrow, [
                        takeAt(yesterday, "09:00"),
                        takeAt(today, "09:00"),
                        takeAt(tomorrow, "09:00")
                    ]);
                });

                it("handles a maximum number of times when there's none taken", function () {
                    return check({
                        regularly: true,
                        as_needed: false,
                        until: { type: "number", stop: 4 },
                        frequency: { n: 1, unit: "day" },
                        times: [{ type: "exact", time: "09:00" }],
                        take_with_food: null,
                        take_with_medications: [],
                        take_without_medications: []
                    }, yesterday, tomorrow, [
                        takeAt(yesterday, "09:00"),
                        takeAt(today, "09:00"),
                        takeAt(tomorrow, "09:00")
                    ], undefined, 0);
                });

                it("handles a maximum number of times when there's some taken", function () {
                    return check({
                        regularly: true,
                        as_needed: false,
                        until: { type: "number", stop: 4 },
                        frequency: { n: 1, unit: "day" },
                        times: [{ type: "exact", time: "09:00" }],
                        take_with_food: null,
                        take_with_medications: [],
                        take_without_medications: []
                    }, yesterday, tomorrow, [
                        takeAt(yesterday, "09:00"),
                        takeAt(today, "09:00")
                    ], undefined, 2);
                });

                it("handles a maximum number of times when there's many taken", function () {
                    return check({
                        regularly: true,
                        as_needed: false,
                        until: { type: "number", stop: 4 },
                        frequency: { n: 1, unit: "day" },
                        times: [{ type: "exact", time: "09:00" }],
                        take_with_food: null,
                        take_with_medications: [],
                        take_without_medications: []
                    }, yesterday, tomorrow, [], undefined, 4);
                });

                it("handles a maximum number of times when there's more than the maximum taken", function () {
                    return check({
                        regularly: true,
                        as_needed: false,
                        until: { type: "number", stop: 4 },
                        frequency: { n: 1, unit: "day" },
                        times: [{ type: "exact", time: "09:00" }],
                        take_with_food: null,
                        take_with_medications: [],
                        take_without_medications: []
                    }, yesterday, tomorrow, [], undefined, 5);
                });

                it("handles a stop date before the start date", function () {
                    return check({
                        regularly: true,
                        as_needed: false,
                        until: { type: "date", stop: weekAgo },
                        frequency: { n: 1, unit: "day" },
                        times: [{ type: "exact", time: "09:00" }],
                        take_with_food: null,
                        take_with_medications: [],
                        take_without_medications: []
                    }, yesterday, tomorrow, []);
                });
                it("handles a stop date between the start and end dates", function () {
                    return check({
                        regularly: true,
                        as_needed: false,
                        until: { type: "date", stop: today },
                        frequency: { n: 1, unit: "day" },
                        times: [{ type: "exact", time: "09:00" }, { type: "unspecified" }],
                        take_with_food: null,
                        take_with_medications: [],
                        take_without_medications: []
                    }, yesterday, tomorrow, [
                        takeAt(yesterday, "09:00"),
                        takeOn(yesterday),
                        takeAt(today, "09:00"),
                        takeOn(today)
                    ]);
                });
                it("handles a stop date after the end date", function () {
                    return check({
                        regularly: true,
                        as_needed: false,
                        until: { type: "date", stop: weekFromNow },
                        frequency: { n: 1, unit: "day" },
                        times: [{ type: "exact", time: "09:00" }],
                        take_with_food: null,
                        take_with_medications: [],
                        take_without_medications: []
                    }, yesterday, tomorrow, [
                        takeAt(yesterday, "09:00"),
                        takeAt(today, "09:00"),
                        takeAt(tomorrow, "09:00")
                    ]);
                });
            });

            describe("'frequency' key", function () {
                it("handles daily", function () {
                    return check({
                        regularly: true,
                        as_needed: false,
                        until: { type: "forever" },
                        frequency: { n: 1, unit: "day" },
                        times: [{ type: "exact", time: "09:00" }],
                        take_with_food: null,
                        take_with_medications: [],
                        take_without_medications: []
                    }, yesterday, tomorrow, [
                        takeAt(yesterday, "09:00"),
                        takeAt(today, "09:00"),
                        takeAt(tomorrow, "09:00")
                    ]);
                });

                it("handles weekdays only", function () {
                    return check({
                        regularly: true,
                        as_needed: false,
                        until: { type: "forever" },
                        frequency: {
                            n: 1,
                            unit: "day",
                            exclude: { exclude: [5, 6], repeat: 7 },
                            start: startOfWeek
                        },
                        times: [{ type: "exact", time: "09:00" }],
                        take_with_food: null,
                        take_with_medications: [],
                        take_without_medications: []
                    }, startOfWeek, endOfWeek, [
                        takeAt(startOfWeek, "09:00"),
                        takeAt(moment(startOfWeek).add(1, "day"), "09:00"),
                        takeAt(moment(startOfWeek).add(2, "days"), "09:00"),
                        takeAt(moment(startOfWeek).add(3, "days"), "09:00"),
                        takeAt(moment(startOfWeek).add(4, "days"), "09:00")
                    ]);
                });

                it("handles weekly", function () {
                    return check({
                        regularly: true,
                        as_needed: false,
                        until: { type: "forever" },
                        frequency: { n: 7, unit: "day", start: startOfWeek },
                        times: [{ type: "exact", time: "09:00" }],
                        take_with_food: null,
                        take_with_medications: [],
                        take_without_medications: []
                    }, startOfWeek, endOfWeek, [
                        takeAt(startOfWeek, "09:00")
                    ]);
                });

                it("handles monthly", function () {
                    return check({
                        regularly: true,
                        as_needed: false,
                        until: { type: "forever" },
                        frequency: { n: 1, unit: "month", start: startOfYear },
                        times: [{ type: "exact", time: "09:00" }],
                        take_with_food: null,
                        take_with_medications: [],
                        take_without_medications: []
                    }, startOfYear, endOfYear, [
                        takeAt(startOfYear, "09:00"),
                        takeAt(moment(startOfYear).add(1, "month"), "09:00"),
                        takeAt(moment(startOfYear).add(2, "months"), "09:00"),
                        takeAt(moment(startOfYear).add(3, "months"), "09:00"),
                        takeAt(moment(startOfYear).add(4, "months"), "09:00"),
                        takeAt(moment(startOfYear).add(5, "months"), "09:00"),
                        takeAt(moment(startOfYear).add(6, "months"), "09:00"),
                        takeAt(moment(startOfYear).add(7, "months"), "09:00"),
                        takeAt(moment(startOfYear).add(8, "months"), "09:00"),
                        takeAt(moment(startOfYear).add(9, "months"), "09:00"),
                        takeAt(moment(startOfYear).add(10, "months"), "09:00"),
                        takeAt(moment(startOfYear).add(11, "months"), "09:00")
                    ]);
                });

                it("handles yearly", function () {
                    return check({
                        regularly: true,
                        as_needed: false,
                        until: { type: "forever" },
                        frequency: { n: 1, unit: "year", start: startOfYear },
                        times: [{ type: "exact", time: "09:00" }],
                        take_with_food: null,
                        take_with_medications: [],
                        take_without_medications: []
                    }, startOfYear, moment(endOfYear).add(1, "month"), [
                        takeAt(startOfYear, "09:00"),
                        takeAt(moment(startOfYear).add(1, "year"), "09:00")
                    ]);
                });

                it("handles a stop date", function () {
                    return check({
                        regularly: true,
                        as_needed: false,
                        until: { type: "forever" },
                        frequency: { n: 3, unit: "day", start: moment(startOfWeek).add(1, "day") },
                        times: [{ type: "exact", time: "09:00" }],
                        take_with_food: null,
                        take_with_medications: [],
                        take_without_medications: []
                    }, startOfWeek, endOfWeek, [
                        takeAt(moment(startOfWeek).add(1, "day"), "09:00"),
                        takeAt(moment(startOfWeek).add(4, "days"), "09:00")
                    ]);
                });
            });

            describe("'times' key", function () {
                it("handles no times", function () {
                    return check({
                        regularly: true,
                        as_needed: false,
                        until: { type: "forever" },
                        frequency: { n: 1, unit: "day" },
                        times: [],
                        take_with_food: null,
                        take_with_medications: [],
                        take_without_medications: []
                    }, startOfWeek, endOfWeek, []);
                });

                it("handles all types of time", function () {
                    return check({
                        regularly: true,
                        as_needed: false,
                        until: { type: "forever" },
                        frequency: { n: 1, unit: "day" },
                        times: [
                            // before after should give the same dose time but a different
                            // notification time
                            { type: "event", event: "sleep", when: "after" },
                            { type: "event", event: "breakfast", when: "before" },
                            { type: "event", event: "breakfast", when: "after" },
                            { type: "event", event: "lunch", when: "before" },
                            { type: "event", event: "lunch", when: "after" },
                            { type: "event", event: "dinner", when: "before" },
                            { type: "event", event: "dinner", when: "after" },
                            { type: "event", event: "sleep", when: "before" },
                            { type: "exact", time: "09:00" },
                            { type: "unspecified" }
                        ],
                        take_with_food: null,
                        take_with_medications: [],
                        take_without_medications: []
                    }, today, today, [
                        takeAt(today, "08:00"), // after sleep
                        takeAt(today, "09:00"), // before breakfast
                        takeAt(today, "09:00"), // after breakfast
                        takeAt(today, "09:00"), // 09:00
                        takeAt(today, "12:00"), // before lunch
                        takeAt(today, "12:00"), // after lunch
                        takeAt(today, "18:00"), // before dinner
                        takeAt(today, "18:00"), // after dinner
                        takeAt(today, "23:00"), // before sleep
                        takeOn(today) // any time
                    ], {
                        sleep: "23:00",
                        wake: "08:00",
                        breakfast: "09:00",
                        lunch: "12:00",
                        dinner: "18:00"
                    });
                });

                it("sorts times in ascending order and pushes date-only events to end of day", function () {
                    return check({
                        regularly: true,
                        as_needed: false,
                        until: { type: "forever" },
                        frequency: { n: 1, unit: "day" },
                        times: [
                            // before after should give the same dose time but a different
                            // notification time
                            { type: "exact", time: "10:00" },
                            { type: "unspecified" },
                            { type: "exact", time: "09:00" }
                        ],
                        take_with_food: null,
                        take_with_medications: [],
                        take_without_medications: []
                    }, today, tomorrow, [
                        takeAt(today, "09:00"),
                        takeAt(today, "10:00"),
                        takeOn(today),
                        takeAt(tomorrow, "09:00"),
                        takeAt(tomorrow, "10:00"),
                        takeOn(tomorrow)
                    ]);
                });

                it("defaults to sensible defaults when no habits are specified", function () {
                    return check({
                        regularly: true,
                        as_needed: false,
                        until: { type: "forever" },
                        frequency: { n: 1, unit: "day" },
                        times: [{ type: "event", event: "sleep", when: "after" }],
                        take_with_food: null,
                        take_with_medications: [],
                        take_without_medications: []
                    }, today, today, [
                        takeAt(today, "07:00")
                    ]);
                });

                it("handles sleep schedules that are overnight", function () {
                    return check({
                        regularly: true,
                        as_needed: false,
                        until: { type: "forever" },
                        frequency: { n: 1, unit: "day" },
                        times: [{ type: "event", event: "sleep", when: "before" }],
                        take_with_food: null,
                        take_with_medications: [],
                        take_without_medications: []
                    }, today, today, [
                        takeAt(tomorrow, "03:00")
                    ], {
                        wake: "10:00",
                        sleep: "03:00"
                    });
                });
            });
        });


        // user habits are entered as HH:MM local time and a timezone is sent
        // medication schedules contain HH:MMs: they're local time and correspond to the timezone in habits
        // start and end date for schedule generation are sent without time: they're assumed to be in the
        //      **local** timezone of the user
        // when moving timezone, the new timezone can be PUT to /habits and
        //      HH:MM user habits
        //      HH:MM medication input schedules
        // are changed
        //
        // we want daylight savings handling, so rather than storing UTC offset we store a TZ zone name
        // e.g., Europe/London
        //
        // journal entries, adherence events are sent in ISO8601 UTC
        describe("handles timezones", function () {
            describe("with a patient in EST", function () {
                var schedule, habits;
                before(function () {
                    habits = {
                        // EST all year round (no EDT)
                        tz: "America/Jamaica",
                        wake: "12:00",
                        dinner: "19:00",
                        sleep: "04:00"
                    };
                    // create and store schedule
                    schedule = new Schedule({
                        regularly: true,
                        as_needed: false,
                        until: { type: "forever" },
                        frequency: { n: 1, unit: "day" },
                        times: [
                            { type: "event", event: "sleep", when: "after" },
                            { type: "exact", time: "14:00" },
                            { type: "event", event: "dinner", when: "before" },
                            { type: "event", event: "sleep", when: "before" }
                        ],
                        take_with_food: null,
                        take_with_medications: [],
                        take_without_medications: []
                    }, habits);
                });

                it("should return an EST schedule", function () {
                    expect(schedule.isValid()).to.be.true;
                    // takeAt takes UTC times
                    var results = schedule.generate(
                            today.format("YYYY-MM-DD"),
                            tomorrow.format("YYYY-MM-DD"),
                            habits
                    ).map(function (item) {
                        delete item.index;
                        return item;
                    });

                    return expect(results).to.deep.equal([
                        takeAt(today, "17:00"),
                        takeAt(today, "19:00"),
                        takeAt(tomorrow, "00:00"),
                        takeAt(tomorrow, "09:00"),
                        takeAt(tomorrow, "17:00"),
                        takeAt(tomorrow, "19:00"),
                        takeAt(moment(today).add(2, "days"), "00:00"),
                        takeAt(moment(today).add(2, "days"), "09:00")
                    ]);
                });

                describe("when timezone updated to PST", function () {
                    // habits should not change time modulo local time
                    // real times should change time
                    it("should return a PST schedule", function () {
                        var newHabits = extend(habits, {
                            // PST all year round (no PDT)
                            tz: "America/Metlakatla"
                        });
                        var results = schedule.generate(
                                today.format("YYYY-MM-DD"),
                                tomorrow.format("YYYY-MM-DD"),
                                newHabits
                        ).map(function (item) {
                            delete item.index;
                            return item;
                        });

                        return expect(results).to.deep.equal([
                            takeAt(today, "19:00"), // 2PM *EST* in UTC
                            takeAt(today, "20:00"), // after sleep: 12PM PST in UTC
                            takeAt(tomorrow, "03:00"), // before dinner: 7PM PST in UTC
                            takeAt(tomorrow, "12:00"), // before sleep: 4AM PST in uTC
                            takeAt(tomorrow, "19:00"),
                            takeAt(tomorrow, "20:00"),
                            takeAt(moment(today).add(2, "days"), "03:00"),
                            takeAt(moment(today).add(2, "days"), "12:00")
                        ]);
                    });
                });
            });
        });
    });
});
