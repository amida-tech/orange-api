"use strict";
var chakram         = require("chakram"),
    util            = require("util"),
    Q               = require("q"),
    querystring     = require("querystring"),
    auth            = require("../common/auth.js"),
    patients        = require("../patients/common.js"),
    fixtures        = require("./fixtures.js");

var expect = chakram.expect;

describe("Medications", function () {
    describe("List All Patients Medications (GET /medications)", function () {
        // basic endpoint
        var list = function (accessToken, parameters) {
            if (typeof parameters === "undefined" || parameters === null) parameters = {};
            var query = querystring.stringify(parameters);

            var url = util.format("http://localhost:5000/v1/medications?%s", query);
            return chakram.get(url, auth.genAuthHeaders(accessToken));
        };
        // check it requires valid user authentication
        auth.itRequiresAuthentication(list);

        describe("with test medications set up", function () {
            // setup a test user
            var user;
            before(function () {
                return auth.createTestUser().then(function (u) {
                    user = u;
                });
            });

            // setup a test patient owned by that user
            var patient;
            before(function () {
                return patients.createMyPatient({}, user).then(function (p) {
                    patient = p;
                });
            });

            // setup another test patient owned by another user
            var otherPatient;
            before(function () {
                return auth.createTestUser().then(function (other) {
                    return patients.createOtherPatient({}, user, other).then(function (p) {
                        otherPatient = p;
                        return Q.nbind(p.share, p)(user.email, "read", "anyone");
                    });
                });
            });

            // setup a medication for patient
            var medication;
            before(function () {
                var create = Q.nbind(patient.createMedication, patient);
                return fixtures.build("Medication", {
                    name: "foo"
                }).then(function (m) {
                    // setting in fixture building above
                    // confuses the virtual named schedule
                    m.setData({
                        schedule: {
                            as_needed: false,
                            regularly: true,
                            until: { type: "forever" },
                            frequency: { n: 1, unit: "day" },
                            times: [{ type: "exact", time: "09:00" }],
                            take_with_food: null,
                            take_with_medications: [],
                            take_without_medications: []
                        }
                    }, patient.habits);
                    return m.getData(patient);
                }).then(create).then(function (m) {
                    medication = m;
                });
            });

            // setup a medication for the other user's patient
            var otherMedication;
            before(function () {
                var create = Q.nbind(otherPatient.createMedication, otherPatient);
                return fixtures.build("Medication", {
                    name: "bar"
                }).then(function (m) {
                    return m.getData();
                }).then(create).then(function (m) {
                    otherMedication = m;
                });
            });

            it("lists both medications", function () {
                return list(user.accessToken, {}).then(function (response) {
                    expect(response).to.be.a.medication.listAllPatientSuccess;
                    expect(response.body.count).to.equal(2);

                    var medIds = response.body.medications.map(function (m) {
                        return m.id;
                    });
                    expect(medIds.length).to.equal(2);
                    expect(medIds).to.include(medication._id);
                    expect(medIds).to.include(otherMedication._id);

                    var patientIds = response.body.medications.map(function (m) {
                        return m.patient_id;
                    });
                    expect(patientIds.length).to.equal(2);
                    expect(patientIds).to.include(patient._id);
                    expect(patientIds).to.include(otherPatient._id);
                });
            });

            it("still allows filtering", function () {
                return list(user.accessToken, {
                    name: "foo"
                }).then(function (response) {
                    expect(response).to.be.a.medication.listAllPatientSuccess;
                    expect(response.body.count).to.equal(1);

                    var medIds = response.body.medications.map(function (m) {
                        return m.id;
                    });
                    expect(medIds.length).to.equal(1);
                    expect(medIds).to.include(medication._id);
                });
            });
        });
    });
});
