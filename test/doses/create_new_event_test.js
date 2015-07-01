"use strict";
var chakram         = require("chakram"),
    util            = require("util"),
    curry           = require("curry"),
    Q               = require("q"),
    auth            = require("../common/auth.js"),
    patients        = require("../patients/common.js"),
    fixtures        = require("./fixtures.js");

var expect = chakram.expect;

describe("Doses", function () {
    describe("Add New Dosing Event (POST /patients/:patientid/doses)", function () {
        // basic endpoint
        var create = function (data, patientId, accessToken) {
            var url = util.format("http://localhost:3000/v1/patients/%d/doses", patientId);
            return chakram.post(url, data, auth.genAuthHeaders(accessToken));
        };

        // given a patient and user nested within the patient, try and create a new medication for
        // that patient and then a new dosing event for that medication
        // event for the patient based on the factory
        var createDose = function (data, patient) {
            return Q.nbind(patient.createMedication, patient)({name: "foobar"}).then(function (medication) {
                return fixtures.build("Dose", data).then(function (dose) {
                    // allow medication_id to be explicitly overwritten
                    if (!("medication_id" in data)) dose.medicationId = medication._id;

                    dose.setData(data);
                    var output = dose.getData();

                    // have to explitly set these (see journal entry tests for explanation)
                    if ("date" in data) output.date = data.date;

                    return create(output, patient._id, patient.user.accessToken);
                });
            });
        };
        // create patient, user and dose event automatically
        var createPatientDose = function (data) {
            return patients.testMyPatient({}).then(curry(createDose)(data));
        };

        // check it requires a valid user and patient
        patients.itRequiresAuthentication(curry(create)({}));
        patients.itRequiresValidPatientId(curry(create)({}));

        it("should let me create valid doses for my patients", function () {
            return expect(createPatientDose({})).to.be.a.dose.createSuccess;
        });

        // validation testing
        it("requires a date", function () {
            return expect(createPatientDose({ date: undefined })).to.be.an.api.error(400, "date_required");
        });
        it("requires a nonblank date", function () {
            return expect(createPatientDose({ date: "" })).to.be.an.api.error(400, "date_required");
        });
        it("rejects invalid dates", function () {
            return expect(createPatientDose({ date: "foobar" })).to.be.an.api.error(400, "invalid_date");
        });

        it("allows freeform notes", function () {
            return expect(createPatientDose({ notes: "foobar" })).to.be.a.dose.createSuccess;
        });
        it("doesn't require notes", function () {
            return expect(createPatientDose({ notes: undefined })).to.be.a.dose.createSuccess;
        });
        it("allows blank notes", function () {
            return expect(createPatientDose({ notes: "" })).to.be.a.dose.createSuccess;
        });
        it("allows null notes", function () {
            return expect(createPatientDose({ notes: null })).to.be.a.dose.createSuccess;
        });

        it("requires a medication id", function () {
            return expect(createPatientDose({
                medication_id: undefined
            })).to.be.an.api.error(400, "invalid_medication_id");
        });
        it("rejects a blank medication ID", function () {
            return expect(createPatientDose({
                medication_id: ""
            })).to.be.an.api.error(400, "invalid_medication_id");
        });
        it("rejects an invalid medication ID", function () {
            return expect(createPatientDose({
                medication_id: "foo"
            })).to.be.an.api.error(400, "invalid_medication_id");
        });
        it("rejects an medication ID not corresponding to a real medication", function () {
            return expect(createPatientDose({
                medication_id: 9999
            })).to.be.an.api.error(400, "invalid_medication_id");
        });

        describe("with multiple medications setup", function () {
            var user, patient, otherPatient;
            before(function () {
                // setup current user and two patients for them, both with a medication
                return auth.createTestUser().then(function (u) {
                    user = u;
                    // create patients
                    return Q.all([
                        patients.createMyPatient({}, user),
                        patients.createMyPatient({}, user)
                    ]).spread(function (p1, p2) {
                        patient = p1;
                        otherPatient = p2;
                    }).then(function () {
                        var medication = Q.nbind(patient.createMedication, patient)({ name: "foobar" });
                        var otherMedication = Q.nbind(otherPatient.createMedication, otherPatient)({ name: "foobar" });
                        return medication.then(otherMedication);
                    });
                });
            });
            it("rejects a medication ID belonging to another patient", function () {
                var endpoint = create({
                    notes: "foobar",
                    date: (new Date()).toISOString(),
                    medication_id: otherPatient.medications[0]._id
                }, patient._id, patient.user.accessToken);
                return expect(endpoint).to.be.an.api.error(400, "invalid_medication_id");
            });
        });
    });
});
