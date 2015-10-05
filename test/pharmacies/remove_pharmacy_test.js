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

describe("Pharmacies", function () {
    describe("Remove Pharmacy (DELETE /patients/:patientid/pharmacies/:pharmacyid)", function () {
        // basic endpoint
        var remove = function (pharmacyId, patientId, accessToken) {
            var url = util.format("http://localhost:5000/v1/patients/%d/pharmacies/%d", patientId, pharmacyId);
            return chakram.delete(url, {}, auth.genAuthHeaders(accessToken));
        };

        // given a patient and user nested within the patient, create a new
        // pharmacy for the patient based on the factory template, and then remove the pharmacy
        var removePharmacy = function (data, patient) {
            var create = Q.nbind(patient.createPharmacy, patient);
            return fixtures.build("Pharmacy", data).then(create).then(function (pharmacy) {
                return remove(pharmacy._id, patient._id, patient.user.accessToken);
            });
        };
        // create patient and user and remove them automatically
        var removePatientPharmacy = function (data) {
            return patients.testMyPatient({}).then(curry(removePharmacy)(data));
        };

        // check it requires a valid user, patient and pharmacy
        patients.itRequiresAuthentication(curry(remove)(1));
        patients.itRequiresValidPatientId(curry(remove)(1));
        common.itRequiresValidPharmacyId(remove);
        patients.itRequiresWriteAuthorization(curry(removePharmacy)({}));

        it("lets me remove pharmacies for my patients", function () {
            return expect(removePatientPharmacy({})).to.be.a.pharmacy.success;
        });
    });
});
