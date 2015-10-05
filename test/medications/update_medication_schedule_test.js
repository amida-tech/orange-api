"use strict";
var chakram     = require("chakram"),
    moment      = require("moment-timezone"),
    Q           = require("q"),
    patients    = require("../patients/common.js"),
    updateMed   = require("./update_medication_test.js").update,
    createDose  = require("../doses/create_new_event_test.js").create,
    schedule    = require("../schedule/schedule_test.js").show;

var expect = chakram.expect;

describe("Medications", function () {
    describe("Update Medication Schedule Test", function () {
        // setup a test user and patient
        var patient;
        before(function () {
            return patients.testMyPatient({}).then(function (p) {
                patient = p;
            });
        });

        // setup test medication, with an initial schedule of twice per day
        var medication;
        before(function () {
            return Q.nbind(patient.createMedication, patient)({
                name: "test medication",
                schedule: {
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
                }
            }).then(function (m) {
                m.schedules[0].date = moment().subtract(10, "days").unix();
                medication = m;
                m.markModified("schedules");
                patient.markModified("medications");
                return Q.nbind(patient.save, patient)();
            });
        });
        var beforeChange = moment().subtract(10, "days");
        var afterChange = moment().add(10, "days");

        // create two doses
        before(function () {
            return Q.nbind(patient.createDose, patient)({
                notes: "",
                date: beforeChange,
                taken: true,
                medication_id: medication._id,
                scheduled: 0
            });
        });
        before(function () {
            return Q.nbind(patient.createDose, patient)({
                notes: "",
                date: beforeChange,
                taken: true,
                medication_id: medication._id,
                scheduled: 1
            });
        });

        it("should let us change the schedule to once per day", function () {
            return expect(updateMed({
                schedule: {
                    as_needed: false,
                    regularly: true,
                    until: { type: "forever" },
                    frequency: { n: 1, unit: "day" },
                    times: [
                        { type: "exact", time: "09:00 am" }
                    ],
                    take_with_food: null,
                    take_with_medications: [],
                    take_without_medications: []
                }
            }, medication._id, patient._id, patient.user.accessToken)).to.be.a.medication.success;
        });

        it("should let us record a dose for the new schedule", function () {
            return expect(createDose({
                notes: "",
                date: afterChange,
                taken: true,
                medication_id: medication._id,
                scheduled: 0
            }, patient._id, patient.user.accessToken)).to.be.a.dose.createSuccess;

        });

        // recording doses with multiple schedules checked more comprehensively in dose unit tests

        it("should generate a schedule match up correctly", function () {
            var start = moment(beforeChange).subtract(1, "day");
            var end = moment(afterChange).add(1, "day");
            var endpoint = schedule(start, end, medication._id, patient._id, patient.user.accessToken);
            return endpoint.then(function (resp) {
                expect(resp).to.be.a.schedule.resp;

                // 3 doses taken
                expect(resp.body.schedule.filter(function (e) {
                    return e.took_medication === true;
                }).length).to.equal(3);

                // start with two a day
                expect(resp.body.schedule[0].scheduled).to.equal(0);
                expect(resp.body.schedule[1].scheduled).to.equal(1);
                expect(resp.body.schedule[2].scheduled).to.equal(0);
                expect(resp.body.schedule[3].scheduled).to.equal(1);

                // end with one a day
                var l = resp.body.schedule.length;
                expect(resp.body.schedule[l - 1].scheduled).to.equal(0);
                expect(resp.body.schedule[l - 2].scheduled).to.equal(0);
                expect(resp.body.schedule[l - 3].scheduled).to.equal(0);
                expect(resp.body.schedule[l - 4].scheduled).to.equal(0);
            });
        });
    });
});
