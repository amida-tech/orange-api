"use strict";
var chakram     = require("chakram"),
    mongoose    = require("mongoose"),
    moment      = require("moment-timezone"),
    Q           = require("q"),
    patients    = require("../../patients/common.js"),
    create      = require("../create_new_event_test.js").create,
    updateMed   = require("../../medications/update_medication_test.js").update;

var expect = chakram.expect;

describe("Doses", function () {
    describe("Schedule Versioning Test", function () {
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
                medication = m;
            });
        });

        // change the schedule (effective now) to once per day
        before(function () {
            return updateMed({
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
            }, medication._id, patient._id, patient.user.accessToken);
        });

        var beforeChange = moment().subtract(10, "days");
        var afterChange = moment().add(10, "days");

        describe("doses before schedule change", function () {
            it("allows creating a dose for the first time", function () {
                return expect(create({
                    notes: "",
                    date: beforeChange,
                    taken: true,
                    medication_id: medication._id,
                    scheduled: 0
                }, patient._id, patient.user.accessToken)).to.be.a.dose.createSuccess;
            });

            it("allows creating a dose for the second time", function () {
                return expect(create({
                    notes: "",
                    date: beforeChange,
                    taken: true,
                    medication_id: medication._id,
                    scheduled: 1
                }, patient._id, patient.user.accessToken)).to.be.a.dose.createSuccess;
            });
        });

        describe("doses after schedule change", function () {
            it("allows creating a dose for the first time", function () {
                return expect(create({
                    notes: "",
                    date: afterChange,
                    taken: true,
                    medication_id: medication._id,
                    scheduled: 0
                }, patient._id, patient.user.accessToken)).to.be.a.dose.createSuccess;
            });

            it("rejects creating a dose for the second time", function () {
                return expect(create({
                    notes: "",
                    date: afterChange,
                    taken: true,
                    medication_id: medication._id,
                    scheduled: 1
                }, patient._id, patient.user.accessToken)).to.be.an.api.error(400, "invalid_scheduled");
            });
        });
    });
});
