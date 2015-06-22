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
    describe("View Pharmacy (GET /patients/:patientid/pharmacies/:pharmacyid)", function () {
        // basic endpoint
        var show = function (pharmacyId, patientId, accessToken) {
            var url = util.format("http://localhost:3000/v1/patients/%d/pharmacies/%d", patientId, pharmacyId);
            return chakram.get(url, auth.genAuthHeaders(accessToken));
        };

        // given a patient and user nested within the patient, create a new
        // pharmacy for the patient based on the factory template, and then show the pharmacy
        var showPharmacy = function (data, patient) {
            var create = Q.nbind(patient.createPharmacy, patient);
            return fixtures.build("Pharmacy", data).then(create).then(function (pharmacy) {
                return show(pharmacy._id, patient._id, patient.user.accessToken);
            });
        };
        // create patient, user and pharmacy and show them automatically
        var showOtherPatientPharmacy = function (access, data) {
            return patients.testOtherPatient({}, access).then(curry(showPharmacy)(data));
        };
        var showMyPatientPharmacy = function (data) {
            return patients.testMyPatient({}).then(curry(showPharmacy)(data));
        };

        // check it requires a valid user, patient and pharmacy
        patients.itRequiresAuthentication(curry(show)(1));
        patients.itRequiresValidPatientId(curry(show)(1));
        common.itRequiresValidPharmacyId(show);

        it("should let me view pharmacies for my patients", function () {
            return expect(showMyPatientPharmacy({})).to.be.a.pharmacy.success;
        });
        it("should let me view pharmacies for patients shared read-only", function () {
            return expect(showOtherPatientPharmacy("read", {})).to.be.a.pharmacy.success;
        });
        it("should let me view pharmacies for patients shared read-write", function () {
            return expect(showOtherPatientPharmacy("write", {})).to.be.a.pharmacy.success;
        });
        it("should not let me view pharmacies for patients not shared with me", function () {
            return expect(showOtherPatientPharmacy("none", {})).to.be.an.api.error(403, "unauthorized");
        });
    });
});
