"use strict";
var chakram     = require("chakram"),
    curry       = require("curry"),
    Q           = require("q"),
    util        = require("util"),
    auth        = require("../common/auth.js"),
    common      = require("./common.js"),
    patients    = require("../patients/common.js");

var expect = chakram.expect;

describe("Medications", function () {
    describe("Show Single Medication (GET /patients/:patientid/medications/:medicationid)", function () {
        // given a patient ID, medication ID and access token, try and show the medication
        var show = module.exports.show = function (medicationId, patientId, accessToken) {
            var url = util.format("http://localhost:5000/v1/patients/%d/medications/%d", patientId, medicationId);
            return chakram.get(url, auth.genAuthHeaders(accessToken));
        };
        var showMedication = function (patient, medication) {
            return show(medication._id, patient._id, patient.user.accessToken);
        };

        patients.itRequiresAuthentication(curry(show)(1));
        patients.itRequiresValidPatientId(curry(show)(1));
        common.itRequiresReadAuthorization(showMedication);

        it("lets me view medications referencing pharmacies and doctors", function () {
            // we validate the child pharmacy and doctor schema
            return patients.testMyPatient({}).then(function (patient) {
                var createPharmacy = Q.nbind(patient.createPharmacy, patient);
                var createDoctor = Q.nbind(patient.createDoctor, patient);
                var createMedication = Q.nbind(patient.createMedication, patient);

                var ep = createPharmacy({
                    name: "test pharmacy"
                }).then(function () {
                    return createDoctor({
                        name: "test doctor"
                    });
                }).then(function () {
                    return createMedication({
                        name: "loratadine",
                        pharmacy_id: patient.pharmacies[0]._id,
                        doctor_id: patient.doctors[0]._id
                    });
                }).then(function (medication) {
                    return show(medication._id, patient._id, patient.user.accessToken);
                });

                return expect(ep).to.be.a.medication.viewSuccess;
            });
        });
    });
});
