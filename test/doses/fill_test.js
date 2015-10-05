"use strict";
var chakram         = require("chakram"),
    util            = require("util"),
    Q               = require("q"),
    auth            = require("../common/auth.js"),
    patients        = require("../patients/common.js");

var expect = chakram.expect;

describe("Doses", function () {
    describe("Updates Medication Fill Date", function () {
        // setup test user and patient with medication
        var patient;
        beforeEach(function () {
            return auth.createTestUser().then(function (user) {
                return patients.createMyPatient({}, user);
            }).then(function (p) {
                patient = p;
                return Q.nbind(patient.createMedication, patient)({
                    name: "patient",
                    quantity: 7,
                    dose: {
                        quantity: 5,
                        unit: "pills"
                    },
                    fill_date: "2015-05-01"
                });
            });
        });

        // create dose for med
        var createDose = function () {
            return Q.nbind(patient.createDose, patient)({
                medication_id: patient.medications[0]._id,
                // date irrelevant as long as it's after fill_date above
                date: (new Date()).toISOString(),
                taken: true,
                notes: ""
            });
        };

        // endpoint to view med details
        var show = function () {
            var url = util.format("http://localhost:5000/v1/patients/%d/medications/%d", patient._id,
                    patient.medications[0]._id);
            return chakram.get(url, auth.genAuthHeaders(patient.user.accessToken));
        };

        describe("with one dose", function () {
            beforeEach(createDose);

            it("calculates number_left correctly", function () {
                return show().then(function (response) {
                    expect(response.body.number_left).to.equal(2);
                });
            });
        });

        describe("with two doses", function () {
            beforeEach(function () {
                return createDose().then(createDose);
            });

            it("caps at 0", function () {
                return show().then(function (response) {
                    expect(response.body.number_left).to.equal(0);
                });
            });
        });
    });
});
