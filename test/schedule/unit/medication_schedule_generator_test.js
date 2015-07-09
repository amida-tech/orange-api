"use strict";
var chai        = require("chai"),
    moment      = require("moment-timezone"),
    sinon       = require("sinon"),
    extend      = require("xtend"),
    mongoose    = require("mongoose"),
    Q           = require("q"),
    patients    = require("../../patients/common.js"),
    Schedule    = require("../../../lib/models/schedule/schedule.js"),
    errors      = require("../../../lib/errors.js").ERRORS;
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
            doseDelta = Math.floor(now.diff(moment(now).startOf("day"))/2);
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

        // setup a timeline: day1, day2, day3 and day4, each at the
        // start of their respective days
        // to be used in the rest of this test
        // day3 is today, where the scheduled dose event has already happened
        var day1, day2, day3, day4, clock;
        before(function () {
            day3 = moment.tz(tz).startOf("day");
            day2 = moment(day3).subtract(1, "day");
            day1 = moment(day2).subtract(1, "day");
            day4 = moment(day3).add(1, "day");
        });

        // create 3 dose events: one slightly before the scheduled time on day,
        // one slightly after on day3, and one outside the given range
        // create them on day1 and day3
        var day1Dose, day3Dose;
        before(function () {
            var createDose = Q.nbind(patient.createDose, patient);
            return createDose({
                medication_id: medication._id,
                date: moment(moment.tz(day1, tz).startOf("day") + doseDelta).subtract(30, "minutes")
            }).then(function (d) {
                day1Dose = d;
            }).then(function () {
                return createDose({
                    medication_id: medication._id,
                    date: moment(moment.tz(day3, tz).startOf("day") + doseDelta).add(1, "hour")
                });
            }).then(function (d) {
                day3Dose = d;
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
            return generate(start, end, patient.user, medication._id).then(function (s) {
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

        it("calculates statistics correctly", function () {
            expect(schedule.statistics.took_medication).to.equal(100 * 2.0 / 3.0);
            expect(schedule.statistics.delay).to.equal(45);
            expect(schedule.statistics.delta).to.equal(15);
        });
    });
});
