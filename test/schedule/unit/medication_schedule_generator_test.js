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
            var now = moment.tz(tz);
            doseDelta = Math.floor(now.diff(moment(now).startOf("day")) / 2);
            doseTime = moment.tz(now - doseDelta, tz).format("hh:mm a");

            // console.log("MEDICATION");
            // console.log("Medication should be taken daily at %s local time", doseTime);
            // console.log("=> Dose Delta = %s hours", doseDelta / (60 * 60 * 1000));
            // console.log();

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
                m.schedules[0].date = moment().subtract(10, "days").unix();
                medication = m;

                m.markModified("schedules");
                patient.markModified("medications");
                return Q.nbind(patient.save, patient)();
            });
        });

        // set the default notification offset to be 15 minutes
        before(function () {
            var timeId = medication.schedule.times[0]._id;
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

            // console.log("TIMELINE");
            // console.log("Day 1: %s", day1.format());
            // console.log("Day 2: %s", day2.format());
            // console.log("Day 3: %s", day3.format());
            // console.log("Day 4: %s", day4.format());
            // console.log();
        });

        // create 5 dose events: one on day1, one on day2, one on day2, one outside
        // the given date range, and one superfluous dose representing
        // the user taking a medication "as needed"
        before(function () {
            // console.log("DOSES");
            /*var createDose = function (d) {
                return Q.nbind(patient.createDose, patient)(d).then(function (e) {
                    console.log("Dose %d at %s", e._id, d.date.format());
                });
            };*/
            var createDose = Q.nbind(patient.createDose, patient);
            return createDose({
                medication_id: medication._id,
                date: moment(moment.tz(day1, tz).startOf("day") + doseDelta),
                scheduled: medication.schedule.times[0]._id,
                taken: false
            }).then(function () {
                return createDose({
                    medication_id: medication._id,
                    date: moment(moment.tz(day2, tz).startOf("day") + doseDelta),
                    scheduled: medication.schedule.times[0]._id,
                    taken: true
                });
            }).then(function () {
                return createDose({
                    medication_id: medication._id,
                    date: moment(moment.tz(day3, tz).startOf("day") + doseDelta),
                    scheduled: medication.schedule.times[0]._id,
                    taken: true
                });
            }).then(function () {
                return createDose({
                    medication_id: medication._id,
                    date: moment.tz(day1, tz).subtract(2, "days").utc(),
                    scheduled: medication.schedule.times[0]._id,
                    taken: true
                });
            }).then(function () {
                return createDose({
                    medication_id: medication._id,
                    date: moment(moment.tz(day3, tz).startOf("day") + doseDelta),
                    scheduled: null,
                    taken: true
                });
            //}).then(function () {
                //console.log();
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
            expect(schedule.schedule.length).to.equal(5);
        });

        it("returns 'happened' keys correctly", function () {
            expect(schedule.schedule.filter(function (item) {
                return item.happened;
            }).length).to.equal(4);
        });

        it("returns 'took_medication' and associated keys correctly", function () {
            /*console.log("SCHEDULE");
            schedule.schedule.forEach(function (item) {
                console.log("Event %s. Happened: %s, Scheduled: %d, DoseID: %d, TookMed: %s",
                    moment(item.date).format(), item.happened, item.scheduled, item.dose_id, item.took_medication);
            });
            console.log();*/

            expect(schedule.schedule.filter(function (item) {
                return item.took_medication;
            }).length).to.equal(3);
            expect(schedule.schedule.filter(function (item) {
                return typeof item.dose_id !== "undefined";
            }).length).to.equal(4);
            expect(schedule.schedule.filter(function (item) {
                return typeof item.delay !== "undefined";
            }).length).to.equal(2);

            expect(schedule.schedule.filter(function (item) {
                return item.happened && (typeof item.scheduled !== "undefined");
            }).length).to.equal(3);
            expect(schedule.schedule.filter(function (item) {
                return (!item.happened) && (typeof item.scheduled !== "undefined");
            }).length).to.equal(1);
        });

        it("generates notification times correctly", function () {
            schedule.schedule.forEach(function (item) {
                if (item.type !== "time") return;

                // check notification time is 15 mins before (the default notification
                // offset we set above) the event time
                expect(item).to.include.keys("date");
                if (typeof item.scheduled !== "undefined") {
                    expect(item).to.include.keys("notification");
                    expect(moment(item.date).diff(item.notification, "minutes")).to.equal(15);
                }
            });
        });

        describe("with a user-specific notification", function () {
            // set the user notification offset to be 15 minutes
            before(function () {
                var timeId = medication.schedule.times[0]._id;
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
                    if (typeof item.scheduled !== "undefined") {
                        expect(item).to.include.keys("notification");
                        expect(moment(item.date).diff(item.notification, "minutes")).to.equal(10);
                    }
                });
            });
        });

        it("calculates statistics correctly", function () {
            expect(schedule.statistics.took_medication).to.equal(100 * 2.0 / 3.0);
            expect(schedule.statistics.delay).to.equal(0);
            expect(schedule.statistics.delta).to.equal(0);
        });
    });
});
