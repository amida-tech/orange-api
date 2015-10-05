"use strict";
var chakram     = require("chakram"),
    auth        = require("../common/auth.js"),
    common      = require("./common.js");

var expect = chakram.expect;

describe("Patients", function () {
    describe("Remove Single Patient (DELETE /patients/:patientid)", function () {
        // simple endpoint
        var remove = function (patientId, accessToken) {
            var headers = auth.genAuthHeaders(accessToken);
            return chakram.delete("http://localhost:5000/v1/patients/" + patientId, {}, headers);
        };

        // given a patient and user, try and remove the user
        var removePatient = function (patient) {
            return remove(patient._id, patient.user.accessToken);
        };

        // helpers to create patients before removing them
        var removeAPatient = function (data) {
            return common.testMyPatient(data).then(removePatient);
        };

        common.itRequiresAuthentication(remove);
        common.itRequiresValidPatientId(remove);
        // only the user who created a patient should be able to delete it
        common.itRequiresAuthentication({
            unassociated: false,
            me: true,
            explicitRead: false,
            explicitWrite: false,
            anyoneRead: false,
            anyoneWrite: false,
            familyRead: false,
            familyWrite: false,
            primeRead: false,
            primeWrite: false
        });

        // authorization test
        it("lets me delete my patients", function () {
            return expect(removeAPatient({})).to.be.a.patient.success;
        });
        it("actually deletes the patient", function () {
            return common.testMyPatient({}).then(function (patient) {
                return removePatient(patient).then(function () {
                    var endpoint = common.show(patient._id, patient.user.accessToken);
                    return expect(endpoint).to.be.an.api.error(404, "invalid_patient_id");
                });
            });
        });
    });
});
