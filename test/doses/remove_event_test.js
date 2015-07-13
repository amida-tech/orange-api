"use strict";
var chakram         = require("chakram"),
    util            = require("util"),
    curry           = require("curry"),
    Q               = require("q"),
    auth            = require("../common/auth.js"),
    patients        = require("../patients/common.js"),
    fixtures        = require("./fixtures.js"),
    medications     = require("../medications/common.js"),
    common          = require("./common.js");

var expect = chakram.expect;

describe("Doses", function () {
    describe("Remove Dose Event (DELETE /patients/:patientid/doses/:doseid)", function () {
        // basic endpoint
        var remove = function (doseId, patientId, accessToken) {
            var url = util.format("http://localhost:3000/v1/patients/%d/doses/%d", patientId, doseId);
            return chakram.delete(url, {}, auth.genAuthHeaders(accessToken));
        };

        // given a patient and user nested within the patient, create a new medication and dose
        // event for the patient, and then delete the dose event
        var removeDose = function (data, patient) {
            var createDose = Q.nbind(patient.createDose, patient);

            return Q.nbind(patient.createMedication, patient)({name: "foobar"}).then(function (medication) {
                return fixtures.build("Dose", data).then(function (dose) {
                    // allow medication_id to be explicitly overwritten
                    if (!("medication_id" in data)) dose.medicationId = medication._id;

                    dose.setData(data);
                    return dose.getData();
                }).then(createDose).then(function (dose) {
                    return remove(dose._id, patient._id, patient.user.accessToken);
                });
            });
        };
        // create patient, user and dose event, and remove them automatically
        var removePatientDose = function (data) {
            return patients.testMyPatient({}).then(curry(removeDose)(data));
        };

        // check it requires a valid user, patient and dose
        patients.itRequiresAuthentication(curry(remove)(1));
        patients.itRequiresValidPatientId(curry(remove)(1));
        common.itRequiresValidDoseId(remove);
        patients.itRequiresWriteAuthorization(curry(removeDose)({}));
        medications.itRequiresWriteAuthorization(function (patient, medication) {
            return removeDose({
                medication_id: medication._id
            }, patient);
        });

        it("lets me remove doses for my patients", function () {
            return expect(removePatientDose({})).to.be.a.dose.success;
        });
    });
});
