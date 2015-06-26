"use strict";
var chai        = require("chai"),
    moment      = require("moment-timezone"),
    mongoose    = require("mongoose"),
    Q           = require("q"),
    patients    = require("../../patients/common.js"),
    errors      = require("../../../lib/errors.js").ERRORS;
var expect = chai.expect;

describe("Schedule", function () {
    // TODO: when adherences are present
    describe("generates schedules correctly in a single timezone", function () {
        // generic method to promise to generate a schedule
        var gen = function (schedule, start, end, habits) {
            // format dates as YYYY-MM-DDD
            if (typeof start === "object") start = start.format("YYYY-MM-DD");
            if (typeof end === "object") end = end.format("YYYY-MM-DD");
            if (schedule && typeof schedule.stop_date === "object")
                schedule.stop_date = schedule.stop_date.format("YYYY-MM-DD");

            // habits only needed when checking slugs
            if (typeof habits === "undefined") habits = {
                wake: null, sleep: null, breakfast: null, lunch: null, dinner: null
            };

            // generate schedule
            var Medication = mongoose.model("Medication");
            var med = new Medication();
            // use setData so it parses our input schedule
            med.setData({ name: "test name", schedule: schedule });
            return med.generateSchedule(start, end, habits);
        };
        // check the desired schedule is generated
        var check = function (inSchedule, start, end, desiredSchedule, habits) {
            expect(gen(inSchedule, start, end, habits)).to.deep.equal(desiredSchedule);
        };
        // check generateSchedule errors it with the relevant error
        var checkFails = function (inSchedule, start, end, error, habits) {
            expect(errors).to.include.keys(error);
            expect(gen.bind(this, inSchedule, start, end, habits)).to.throw(errors[error]);
        };

        // helpers to get a datetime object given an HH:MM on a specific day
        var yesterday, today, tomorrow, future, past, weekAgo, weekFromNow;
        before(function () {
            // for testing we assume we're in a UTC timezone rather than having
            // to explicitly pass the system timezone
            today = moment.tz(moment().format("YYYY-MM-DD"), "YYYY-MM-DD", "Etc/UTC");
            yesterday = moment(today).subtract(1, "days");
            tomorrow = moment(today).add(1, "days");
            weekAgo = moment(today).subtract(7, "days");
            weekFromNow = moment(today).add(7, "days");
            future = moment(today).add(10, "years");
            past = moment(today).subtract(10, "years");
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
        var takeOn = function (date, params) {
            var datum = {
                date: date.format("YYYY-MM-DD"),
                type: "date"
            };
            if (typeof params !== "undefined") {
                if (typeof params.maximum !== "undefined") datum.maximum = params.maximum;
                if (typeof params.exactly !== "undefined") datum.exactly = params.exactly;
            }
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
                type: "regularly",
                frequency: 1,
                times_of_day: ["09:00", "13:00"]
            }, "foo", tomorrow, "INVALID_START_DATE");
        });
        it("handles an invalid end date", function () {
            return checkFails({
                type: "regularly",
                frequency: 1,
                times_of_day: ["09:00", "13:00"]
            }, yesterday, "foo", "INVALID_END_DATE");
        });
        it("doesn't allow the start date to be after the end date", function () {
            return checkFails({
                type: "regularly",
                frequency: 1,
                times_of_day: ["09:00", "13:00"]
            }, tomorrow, yesterday, "INVALID_END_DATE");
        });
        it("allows the start date to equal the end date", function () {
            return check({
                type: "regularly",
                frequency: 1,
                times_of_day: ["09:00"]
            }, today, today, [
                takeAt(today, "09:00")
            ]);
        });

        describe("with type as_needed", function () {
            it("generates a day-level schedule", function () {
                return check({
                    type: "as_needed"
                }, yesterday, tomorrow, [
                    takeOn(yesterday),
                    takeOn(today),
                    takeOn(tomorrow)
                ]);
            });
            it("handles a not_to_exceed", function () {
                return check({
                    type: "as_needed",
                    not_to_exceed: 7
                }, yesterday, tomorrow, [
                    takeOn(yesterday, { maximum: 7 }),
                    takeOn(today, { maximum: 7 }),
                    takeOn(tomorrow, { maximum: 7 })
                ]);
            });
            describe("with a stop date", function () {
                it("handles a stop date in the future", function () {
                    return check({
                        type: "as_needed",
                        stop_date: future
                    }, yesterday, tomorrow, [
                        takeOn(yesterday),
                        takeOn(today),
                        takeOn(tomorrow)
                    ]);
                });

                it("handles a stop date in the past", function () {
                    return check({
                        type: "as_needed",
                        stop_date: past
                    }, yesterday, tomorrow, [
                    ]);
                });

                it("handles a stop date in the range", function () {
                    return check({
                        type: "as_needed",
                        stop_date: today
                    }, yesterday, tomorrow, [
                        takeOn(yesterday),
                        takeOn(today)
                    ]);
                });

                it("handles a stop_date and not_to_exceed", function () {
                    return check({
                        type: "as_needed",
                        stop_date: today,
                        not_to_exceed: 5
                    }, yesterday, tomorrow, [
                        takeOn(yesterday, { maximum: 5 }),
                        takeOn(today, { maximum: 5 })
                    ]);
                });
            });
        });

        describe("with type regularly", function () {
            describe("with number_of_times", function () {
                it("generates a day-level schedule", function () {
                    // twice every 3 days
                    return check({
                        type: "regularly",
                        frequency: 3,
                        number_of_times: 2
                    }, weekAgo, weekFromNow, [
                        takeOn(weekAgo, { exactly: 2 }),
                        takeOn(moment(weekAgo).add(3, "days"), { exactly: 2 }),
                        takeOn(moment(weekAgo).add(6, "days"), { exactly: 2 }),
                        takeOn(moment(weekAgo).add(9, "days"), { exactly: 2 }),
                        takeOn(moment(weekAgo).add(12, "days"), { exactly: 2 })
                    ]);
                });
                it("handles a stop_date", function () {
                    // twice every 3 days
                    return check({
                        type: "regularly",
                        frequency: 3,
                        number_of_times: 2,
                        stop_date: moment(weekAgo).add(5, "days")
                    }, weekAgo, weekFromNow, [
                        takeOn(weekAgo, { exactly: 2 }),
                        takeOn(moment(weekAgo).add(3, "days"), { exactly: 2 })
                    ]);
                });
            });
            describe("with times_of_day", function () {
                describe("with times", function () {
                    it("generates a detailed time schedule", function () {
                        return check({
                            type: "regularly",
                            frequency: 6,
                            times_of_day: ["09:00", "13:00"]
                        }, weekAgo, weekFromNow, [
                            takeAt(weekAgo, "09:00"),
                            takeAt(weekAgo, "13:00"),
                            takeAt(moment(weekAgo).add(6, "days"), "09:00"),
                            takeAt(moment(weekAgo).add(6, "days"), "13:00"),
                            takeAt(moment(weekAgo).add(12, "days"), "09:00"),
                            takeAt(moment(weekAgo).add(12, "days"), "13:00")
                        ]);
                    });
                });
                describe("with slugs", function () {
                    it("generates a detailed time schedule", function () {
                        // TODO: check after_lunch is within X minutes of lunch start,
                        // rather than the fixed +15mins used below
                        return check({
                            type: "regularly",
                            frequency: 6,
                            times_of_day: ["after_sleep", "after_lunch", "before_dinner", "before_sleep"]
                        }, today, weekFromNow, [
                            takeAt(today, "08:00"),
                            takeAt(today, "12:15"),
                            takeAt(today, "19:00"),
                            takeAt(today, "23:00"),
                            takeAt(moment(today).add(6, "days"), "08:00"),
                            takeAt(moment(today).add(6, "days"), "12:15"),
                            takeAt(moment(today).add(6, "days"), "19:00"),
                            takeAt(moment(today).add(6, "days"), "23:00")
                        ], {
                            wake: "08:00",
                            lunch: "12:00",
                            dinner: "19:00",
                            sleep: "23:00"
                        });
                    });

                    it("handles sleep schedules intersecting multiple days", function () {
                        return check({
                            type: "regularly",
                            frequency: 6,
                            times_of_day: ["after_sleep", "after_lunch", "before_dinner", "before_sleep"]
                        }, today, weekFromNow, [
                            takeAt(today, "12:00"),
                            takeAt(today, "15:15"),
                            takeAt(today, "22:00"),
                            takeAt(tomorrow, "04:00"),
                            takeAt(moment(today).add(6, "days"), "12:00"),
                            takeAt(moment(today).add(6, "days"), "15:15"),
                            takeAt(moment(today).add(6, "days"), "22:00"),
                            takeAt(moment(tomorrow).add(6, "days"), "04:00")
                        ], {
                            wake: "12:00",
                            lunch: "15:00",
                            dinner: "22:00",
                            sleep: "04:00"
                        });
                    });
                });
                describe("with a combination of both", function () {
                    it("generates a detailed time schedule", function () {
                        return check({
                            type: "regularly",
                            frequency: 6,
                            times_of_day: ["after_sleep", "14:00", "before_dinner", "before_sleep"]
                        }, today, weekFromNow, [
                            takeAt(today, "08:00"),
                            takeAt(today, "14:00"),
                            takeAt(today, "19:00"),
                            takeAt(today, "23:00"),
                            takeAt(moment(today).add(6, "days"), "08:00"),
                            takeAt(moment(today).add(6, "days"), "14:00"),
                            takeAt(moment(today).add(6, "days"), "19:00"),
                            takeAt(moment(today).add(6, "days"), "23:00")
                        ], {
                            wake: "08:00",
                            dinner: "19:00",
                            sleep: "23:00"
                        });
                    });
                    it("handles sleep schedules intersecting multiple days", function () {
                        return check({
                            type: "regularly",
                            frequency: 6,
                            times_of_day: ["after_sleep", "14:00", "before_dinner", "before_sleep"]
                        }, today, weekFromNow, [
                            takeAt(today, "12:00"),
                            takeAt(today, "14:00"),
                            takeAt(today, "19:00"),
                            takeAt(tomorrow, "04:00"),
                            takeAt(moment(today).add(6, "days"), "12:00"),
                            takeAt(moment(today).add(6, "days"), "14:00"),
                            takeAt(moment(today).add(6, "days"), "19:00"),
                            takeAt(moment(today).add(7, "days"), "04:00")
                        ], {
                            wake: "12:00",
                            dinner: "19:00",
                            sleep: "04:00"
                        });
                    });
                    it("handles a stop date", function () {
                        return check({
                            type: "regularly",
                            frequency: 6,
                            times_of_day: ["after_sleep", "14:00", "before_dinner", "before_sleep"],
                            stop_date: today
                        }, today, weekFromNow, [
                            takeAt(today, "12:00"),
                            takeAt(today, "14:00"),
                            takeAt(today, "19:00"),
                            takeAt(tomorrow, "04:00")
                        ], {
                            wake: "12:00",
                            dinner: "19:00",
                            sleep: "04:00"
                        });
                    });
                });
            });
            describe("with interval", function () {
                it("generates a detailed time schedule starting from when the user wakes til sleep", function () {
                    return check({
                        type: "regularly",
                        frequency: 1,
                        interval: 480
                    }, today, tomorrow, [
                        takeAt(today, "09:00"),
                        takeAt(today, "17:00"),
                        takeAt(tomorrow, "01:00"),
                        takeAt(tomorrow, "09:00"),
                        takeAt(tomorrow, "17:00"),
                        takeAt(moment(tomorrow).add(1, "day"), "01:00")
                    ], {
                        wake: "09:00",
                        sleep: "02:00"
                    });
                });

                // TODO: don't assume a default 8am wake time here?
                it("defaults to sensible defaults when no habits are specified", function () {
                    return check({
                        type: "regularly",
                        frequency: 1,
                        interval: 480
                    }, today, tomorrow, [
                        takeAt(today, "08:00"),
                        takeAt(today, "16:00"),
                        takeAt(tomorrow, "00:00"),
                        takeAt(tomorrow, "08:00"),
                        takeAt(tomorrow, "16:00"),
                        takeAt(moment(tomorrow).add(1, "day"), "00:00")
                    ]);
                });
            });
        });

        // TODO: put this into API docs: Timezone Policy
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
                var patient, medication;
                before(function () {
                    // create and store patient
                    return patients.testMyPatient({}).then(function (p) {
                        patient = p;
                    }).then(function () {
                        // set timezone to EST all year round (no EDT in Jamaica)
                        patient.tz = "America/Jamaica";
                        // set sleep habits
                        patient.wake = "12:00";
                        patient.dinner = "19:00";
                        patient.sleep = "04:00";
                        return Q.ninvoke(patient, "save");
                    }).then(function () {
                        // create a medication for the patient with a schedule
                        // specified by both times and habits for completeness
                        return Q.ninvoke(patient, "createMedication", {
                            name: "test medication",
                            schedule: {
                                type: "regularly",
                                frequency: 1,
                                times_of_day: ["after_sleep", "14:00", "before_dinner", "before_sleep"]
                            }
                        });
                    }).then(function (m) {
                        // store medication
                        medication = m;
                    });
                });

                it("should return an EST schedule", function () {
                    var schedule = medication.generateSchedule(today, tomorrow, patient.habits);
                    // takeAt takes UTC times
                    return expect(schedule).to.deep.equal([
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
                    before(function () {
                        // PST all year round (no PDT)
                        patient.tz = "America/Metlakatla";
                    });

                    // habits should not change time modulo local time
                    // real times should change time
                    it("should return a PST schedule", function () {
                        var schedule = medication.generateSchedule(today, tomorrow, patient.habits);
                        return expect(schedule).to.deep.equal([
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
