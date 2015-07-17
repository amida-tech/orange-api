"use strict";
var chai        = require("chai"),
    moment      = require("moment-timezone"),
    Q           = require("q"),
    patients    = require("../../patients/common.js");
var expect = chai.expect;

// we're testing everything other than the controller logic and API functionality here
describe("Schedule", function () {
    describe("matches doses to a generated schedule and returns the expected output", function () {
        // setup test user with patient, in West Coast timzone
        var patient, tz;
        before(function () {
            tz = "America/Los_Angeles";
            return patients.testMyPatient({
                tz: tz
            }).then(function (p) {
                patient = p;
            });
        });

        // setup test medication for them with daily schedule
        var medication, doseTime, doseDelta;
        before(function () {
            // rather than fixing the time the medication is taken at
            // and stubbing the clock so we know what to expect, we have to
            // generate the schedule time based on the current time
            // (zerorpc silently fails when used with a stubbed clock)
            var now = moment.tz(tz);
            doseDelta = Math.floor(now.diff(moment(now).startOf("day")) / 2);
            doseTime = moment.tz(now - doseDelta, tz).format("HH:mm");

            return Q.nbind(patient.createMedication, patient)({
                name: "foo bar",
                schedule: {
                    as_needed: false,
                    regularly: true,
                    until: { type: "forever" },
                    frequency: { n: 1, unit: "day" },
                    times: [{ type: "exact", time: doseTime }],
                    take_with_food: null,
                    take_with_medications: [],
                    take_without_medications: []
                }
            }).then(function (m) {
                medication = m;
            });
        });

        // set the default notification offset to be 15 minutes
        before(function () {
            var timeId = medication.schedule.times[0].id;
            return Q.nbind(medication.updateNotificationSettings, medication)(timeId, patient.user, {
                default: 15
            });
        });

        // setup a timeline: day1, day2, day3 and day4, each at the
        // start of their respective days
        // to be used in the rest of this test
        // day3 is today, where the scheduled dose event has already happened
        var day1, day2, day3, day4;
        before(function () {
            day3 = moment.tz(tz).startOf("day");
            day2 = moment(day3).subtract(1, "day");
            day1 = moment(day2).subtract(1, "day");
            day4 = moment(day3).add(1, "day");
        });

        // create 3 dose events: one slightly before the scheduled time on day,
        // one slightly after on day3, and one outside the given range
        // create them on day1 and day3
        before(function () {
            var createDose = Q.nbind(patient.createDose, patient);
            return createDose({
                medication_id: medication._id,
                date: moment(moment.tz(day1, tz).startOf("day") + doseDelta).subtract(30, "minutes")
            }).then(function () {
                return createDose({
                    medication_id: medication._id,
                    date: moment(moment.tz(day3, tz).startOf("day") + doseDelta).add(1, "hour")
                });
            }).then(function () {
                return createDose({
                    medication_id: medication._id,
                    date: moment(day1).subtract(2, "days")
                });
            });
        });

        // get the response from generating the overall schedule in the patient
        var start, end, schedule;
        before(function () {
            start = day1.format("YYYY-MM-DD");
            end = day4.format("YYYY-MM-DD");
            var generate = Q.nbind(patient.generateSchedule, patient);
            return generate(start, end, patient.user, medication._id, patient.user._id).then(function (s) {
                schedule = s;
            });
        });

        it("has the right keys", function () {
            expect(Object.keys(schedule)).to.deep.equal(["schedule", "statistics"]);
        });

        it("returns the right number of items", function () {
            expect(schedule.schedule.length).to.equal(4);
        });

        it("returns 'happened' keys correctly", function () {
            expect(schedule.schedule.filter(function (item) {
                return item.happened;
            }).length).to.equal(3);
        });

        it("returns 'took_medication' and associated keys correctly", function () {
            expect(schedule.schedule.filter(function (item) {
                return item.took_medication;
            }).length).to.equal(2);
            expect(schedule.schedule.filter(function (item) {
                return typeof item.dose_id !== "undefined";
            }).length).to.equal(2);
            expect(schedule.schedule.filter(function (item) {
                return typeof item.delay !== "undefined";
            }).length).to.equal(2);
        });

        it("generates notification times correctly", function () {
            schedule.schedule.forEach(function (item) {
                if (item.type !== "time") return;

                // check notification time is 15 mins before (the default notification
                // offset we set above) the event time
                expect(item).to.include.keys("date");
                expect(item).to.include.keys("notification");
                expect(moment(item.date).diff(item.notification, "minutes")).to.equal(15);
            });
        });

        describe("with a user-specific notification", function () {
            // set the user notification offset to be 15 minutes
            before(function () {
                var timeId = medication.schedule.times[0].id;
                return Q.nbind(medication.updateNotificationSettings, medication)(timeId, patient.user, {
                    default: 20,
                    user: 10
                });
            });

            before(function () {
                var generate = Q.nbind(patient.generateSchedule, patient);
                return generate(start, end, patient.user, medication._id, patient.user._id).then(function (s) {
                    schedule = s;
                });
            });


            it("generates notification times correctly", function () {
                schedule.schedule.forEach(function (item) {
                    if (item.type !== "time") return;

                    // check notification time is 10 mins before (the notification time we set
                    // for just this user above) the event time
                    expect(item).to.include.keys("date");
                    expect(item).to.include.keys("notification");
                    expect(moment(item.date).diff(item.notification, "minutes")).to.equal(10);
                });
            });
        });

        it("calculates statistics correctly", function () {
            expect(schedule.statistics.took_medication).to.equal(100 * 2.0 / 3.0);
            expect(schedule.statistics.delay).to.equal(45);
            expect(schedule.statistics.delta).to.equal(15);
        });
    });
});
