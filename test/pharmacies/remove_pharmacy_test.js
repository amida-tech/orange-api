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
    common.beforeEach();
    describe("Remove Pharmacy (DELETE /patients/:patientid/pharmacies/:pharmacyid)", function () {
        // basic endpoint
        var remove = function (pharmacyId, patientId, accessToken) {
            var url = util.format("http://localhost:3000/v1/patients/%d/pharmacies/%d", patientId, pharmacyId);
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
        var removeOtherPatientPharmacy = function (access, data) {
            return patients.testOtherPatient({}, access).then(curry(removePharmacy)(data));
        };
        var removeMyPatientPharmacy = function (data) {
            return patients.testMyPatient({}).then(curry(removePharmacy)(data));
        };

        // check it requires a valid user, patient and pharmacy
        patients.itRequiresAuthentication(curry(remove)(1));
        patients.itRequiresValidPatientId(curry(remove)(1));
        common.itRequiresValidPharmacyId(remove);

        it("should let me remove pharmacies for my patients", function () {
            return expect(removeMyPatientPharmacy({})).to.be.a.pharmacy.success;
        });
        it("should not let me remove pharmacies for patients shared read-only", function () {
            return expect(removeOtherPatientPharmacy("read", {})).to.be.an.api.error(403, "unauthorized");
        });
        it("should let me remove pharmacies for patients shared read-write", function () {
            return expect(removeOtherPatientPharmacy("write", {})).to.be.a.pharmacy.success;
        });
        it("should not let me remove pharmacies for patients not shared with me", function () {
            return expect(removeOtherPatientPharmacy("none", {})).to.be.an.api.error(403, "unauthorized");
        });
    });
});
