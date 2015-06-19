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
    describe("Edit Pharmacy (PUT /patients/:patientid/pharmacies/:pharmacyid)", function () {
        // basic endpoint
        var update = function (data, pharmacyId, patientId, accessToken) {
            var url = util.format("http://localhost:3000/v1/patients/%d/pharmacies/%d", patientId, pharmacyId);
            return chakram.put(url, data, auth.genAuthHeaders(accessToken));
        };

        // given a patient and user nested within the patient, create a new
        // pharmacy for the patient based on the factory template, and then update the pharmacy
        var updatePharmacy = function (data, modifications, patient) {
            var create = Q.nbind(patient.createPharmacy, patient);
            return fixtures.build("Pharmacy", data).then(create).then(function (pharmacy) {
                return update(modifications, pharmacy._id, patient._id, patient.user.accessToken);
            });
        };
        // create patient and user and update them automatically
        var updateOtherPatientPharmacy = function (access, data, modifications) {
            return patients.testOtherPatient({}, access).then(curry(updatePharmacy)(data, modifications));
        };
        var updateMyPatientPharmacy = function (data, modifications) {
            return patients.testMyPatient({}).then(curry(updatePharmacy)(data, modifications));
        };

        // check it requires a valid user and patient
        patients.itRequiresAuthentication(curry(update)({}, 1));
        patients.itRequiresValidPatientId(curry(update)({}, 1));
        common.itRequiresValidPharmacyId(curry(update)({}));

        // access permissions
        it("should let me update pharmacies for my patients", function () {
            return expect(updateMyPatientPharmacy({}, {})).to.be.a.pharmacy.success;
        });
        it("should not let me update pharmacies for patients shared read-only", function () {
            return expect(updateOtherPatientPharmacy("read", {}, {})).to.be.an.api.error(403, "unauthorized");
        });
        it("should let me update pharmacies for patients shared read-write", function () {
            return expect(updateOtherPatientPharmacy("write", {}, {})).to.be.a.pharmacy.success;
        });
        it("should not let me update pharmacies for patients not shared with me", function () {
            return expect(updateOtherPatientPharmacy("none", {}, {})).to.be.an.api.error(403, "unauthorized");
        });

        // validations
        it("doesn't allow a blank name", function () {
            return expect(updateMyPatientPharmacy({}, {name: ""})).to.be.an.api.error(400, "name_required");
        });

        describe("schedule mergins", function () {
            it("merges schedules");
        });
    });
});
