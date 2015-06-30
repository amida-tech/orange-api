"use strict";
var chakram         = require("chakram"),
    util            = require("util"),
    curry           = require("curry"),
    Q               = require("q"),
    auth            = require("../common/auth.js"),
    patients        = require("../patients/common.js"),
    fixtures        = require("./fixtures.js"),
    common          = require("./common.js");

var expect = chakram.expect;

describe("Doses", function () {
    describe("Update Dose Event (PUT /patients/:patientid/doses/:doseid)", function () {
        // basic endpoint
        var update = function (modifications, doseId, patientId, accessToken) {
            var url = util.format("http://localhost:3000/v1/patients/%d/doses/%d", patientId, doseId);
            return chakram.put(url, modifications, auth.genAuthHeaders(accessToken));
        };

        // given a patient and user nested within the patient, create a new medication and dose
        // event for the patient, and then update the dose event
        var updateDose = function (modifications, data, patient) {
            var createDose = Q.nbind(patient.createDose, patient);

            return Q.nbind(patient.createMedication, patient)({name: "foobar"}).then(function (medication) {
                return fixtures.build("Dose", data).then(function (dose) {
                    // allow medication_id to be explicitly overwritten
                    if (!("medication_id" in data)) dose.medicationId = medication._id;

                    dose.setData(data);
                    return dose.getData();
                }).then(createDose).then(function (dose) {
                    return update(modifications, dose._id, patient._id, patient.user.accessToken);
                });
            });
        };
        // create patient, user and dose event, and update them automatically
        var updateOtherPatientDose = function (access, data, modifications) {
            return patients.testOtherPatient({}, access).then(curry(updateDose)(modifications, data));
        };
        var updateMyPatientDose = function (data, modifications) {
            return patients.testMyPatient({}).then(curry(updateDose)(modifications, data));
        };

        // check it requires a valid user, patient and dose
        patients.itRequiresAuthentication(curry(update)({}, 1));
        patients.itRequiresValidPatientId(curry(update)({}, 1));
        common.itRequiresValidDoseId(curry(update)({}));

        it("should let me update doses for my patients", function () {
            return expect(updateMyPatientDose({}, {})).to.be.a.dose.success;
        });
        it("should let me update doses for patients shared read-write", function () {
            return expect(updateOtherPatientDose("write", {}, {})).to.be.a.dose.success;
        });
        it("should not let me update doses for patients shared read-only", function () {
            return expect(updateOtherPatientDose("read", {}, {})).to.be.an.api.error(403, "unauthorized");
        });
        it("should not let me update doses for patients not shared with me", function () {
            return expect(updateOtherPatientDose("none", {}, {})).to.be.an.api.error(403, "unauthorized");
        });

        // validation testing
        it("allows updating the date", function () {
            return expect(updateMyPatientDose({}, { date: (new Date()).toISOString() })).to.be.a.dose.success;
        });
        it("rejects a blank date", function () {
            return expect(updateMyPatientDose({}, { date: "" })).to.be.an.api.error(400, "date_required");
        });
        it("rejects invalid dates", function () {
            return expect(updateMyPatientDose({}, { date: "foobar" })).to.be.an.api.error(400, "invalid_date");
        });

        it("allows updating notes", function () {
            return expect(updateMyPatientDose({}, { notes: "foobarbaz" })).to.be.a.dose.success;
        });
        it("resets the notes with an empty value", function () {
            return updateMyPatientDose({}, { notes: "" }).then(function (response) {
                expect(response).to.be.a.dose.success;
                expect(response.body.notes).to.equal("");
            });
        });
        it("resets the notes with null", function () {
            return updateMyPatientDose({}, { notes: null }).then(function (response) {
                expect(response).to.be.a.dose.success;
                expect(response.body.notes).to.equal("");
            });
        });

        it("rejects a blank medication ID", function () {
            return expect(updateMyPatientDose({}, {
                medication_id: ""
            })).to.be.an.api.error(400, "invalid_medication_id");
        });
        it("rejects an invalid medication ID", function () {
            return expect(updateMyPatientDose({}, {
                medication_id: "foo"
            })).to.be.an.api.error(400, "invalid_medication_id");
        });
        it("rejects a medication ID not corresponding to a real medication", function () {
            return expect(updateMyPatientDose({}, {
                medication_id: 9999
            })).to.be.an.api.error(400, "invalid_medication_id");
        });

        describe("with multiple doses and medications setup", function () {
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
                        // create medications (2 for patient, 1 for otherPatient)
                        var medication = Q.nbind(patient.createMedication, patient)({ name: "foobar" });
                        var medication2 = Q.nbind(patient.createMedication, patient)({ name: "foobar" });
                        var otherMedication = Q.nbind(otherPatient.createMedication, otherPatient)({ name: "foobar" });
                        return medication.then(medication2).then(otherMedication);
                    }).then(function () {
                        // create dose
                        return Q.nbind(patient.createDose, patient)({
                            date: (new Date()).toISOString(),
                            medication_id: patient.medications[0]._id
                        });
                    });
                });
            });
            it("rejects a medication ID belonging to another patient", function () {
                var endpoint = update({
                    medication_id: otherPatient.medications[0]._id
                }, patient.doses[0]._id, patient._id, patient.user.accessToken);
                return expect(endpoint).to.be.an.api.error(400, "invalid_medication_id");
            });
            it("allows a medication ID belonging to the current patient", function () {
                var endpoint = update({
                    medication_id: patient.medications[1]._id
                }, patient.doses[0]._id, patient._id, patient.user.accessToken);
                return expect(endpoint).to.be.a.dose.success;
            });
        });
    });
});
