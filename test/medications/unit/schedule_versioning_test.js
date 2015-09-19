"use strict";
var chakram     = require("chakram"),
    Q           = require("q"),
    patients    = require("../../patients/common.js");

var expect = chakram.expect;

describe("Medications", function () {
    describe("Schedule Versioning Test", function () {
        // setup a test user and patient
        var patient;
        before(function () {
            return patients.testMyPatient({}).then(function (p) {
                patient = p;
            });
        });

        // setup test medication
        var medication;
        before(function () {
            return Q.nbind(patient.createMedication, patient)({
                name: "test medication"
            }).then(function (m) {
                medication = m;
            });
        });

        describe("initially", function () {
            it("has an 'as_needed' schedule with no regular part", function () {
                expect(medication.schedule).to.be.an("object");
                expect(medication.schedule.regularly).to.be.false;
                expect(medication.schedule.asNeeded).to.be.true;
            });

            it("only has one schedule version stored", function () {
                expect(medication.schedules).to.be.an("array");
                expect(medication.schedules.length).to.equal(1);
            });
        });

        describe("after updating the schedule to a regular one", function () {
            before(function () {
                medication.schedule = {
                    as_needed: false,
                    regularly: true,
                    until: { type: "forever" },
                    frequency: { n: 1, unit: "day" },
                    times: [
                        { type: "exact", time: "09:00 am" },
                        { type: "exact", time: "10:00 am" }
                    ],
                    take_with_food: null,
                    take_with_medications: [],
                    take_without_medications: []
                };
            });

            it("has a 'regularly' schedule with 2 times", function () {
                expect(medication.schedule).to.be.an("object");
                expect(medication.schedule.regularly).to.be.true;
                expect(medication.schedule.asNeeded).to.be.false;
                expect(medication.schedule.times).to.be.an("array");
                expect(medication.schedule.times.length).to.equal(2);
            });

            it("has two schedule versions stored", function () {
                expect(medication.schedules).to.be.an("array");
                expect(medication.schedules.length).to.equal(2);
            });

            it("has calculated IDs for the times", function () {
                expect(medication.schedule.times[0].id).to.equal(0);
                expect(medication.schedule.times[1].id).to.equal(1);
            });
        });

        describe("after updating the schedule to the same schedule", function () {
            before(function () {
                medication.schedule = {
                    as_needed: false,
                    regularly: true,
                    until: { type: "forever" },
                    frequency: { n: 1, unit: "day" },
                    times: [
                        { type: "exact", time: "09:00 am" },
                        { type: "exact", time: "10:00 am" }
                    ],
                    take_with_food: null,
                    take_with_medications: [],
                    take_without_medications: []
                };
            });

            it("still has a 'regularly' schedule with 2 times", function () {
                expect(medication.schedule).to.be.an("object");
                expect(medication.schedule.regularly).to.be.true;
                expect(medication.schedule.asNeeded).to.be.false;
                expect(medication.schedule.times).to.be.an("array");
                expect(medication.schedule.times.length).to.equal(2);
            });

            it("still has two schedule versions stored", function () {
                expect(medication.schedules).to.be.an("array");
                expect(medication.schedules.length).to.equal(2);
            });

            it("still has calculated IDs for the times", function () {
                expect(medication.schedule.times[0].id).to.equal(0);
                expect(medication.schedule.times[1].id).to.equal(1);
            });
        });

        describe("after updating schedule to a new schedule", function () {
            before(function () {
                medication.schedule = {
                    as_needed: false,
                    regularly: true,
                    until: { type: "forever" },
                    frequency: { n: 1, unit: "day" },
                    times: [
                        { type: "exact", time: "11:00 am" }
                    ],
                    take_with_food: null,
                    take_with_medications: [],
                    take_without_medications: []
                };
            });

            it("has a 'regularly' schedule with 1 time", function () {
                expect(medication.schedule).to.be.an("object");
                expect(medication.schedule.regularly).to.be.true;
                expect(medication.schedule.asNeeded).to.be.false;
                expect(medication.schedule.times).to.be.an("array");
                expect(medication.schedule.times.length).to.equal(1);
            });

            it("has three schedule versions stored", function () {
                expect(medication.schedules).to.be.an("array");
                expect(medication.schedules.length).to.equal(3);
            });

            it("has calculated IDs for the times", function () {
                expect(medication.schedule.times[0].id).to.equal(0);
            });
        });
    });
});
