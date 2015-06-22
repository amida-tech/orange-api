"use strict";
var chakram         = require("chakram"),
    util            = require("util"),
    curry           = require("curry"),
    auth            = require("../common/auth.js"),
    patients        = require("../patients/common.js"),
    fixtures        = require("./fixtures.js"),
    common          = require("./common.js");

var expect = chakram.expect;

describe("Pharmacies", function () {
    common.beforeEach();
    describe("Create New Pharmacy (POST /patients/:patientid/pharmacies)", function () {
        // basic endpoint
        var create = function (data, patientId, accessToken) {
            var url = util.format("http://localhost:3000/v1/patients/%d/pharmacies", patientId);
            return chakram.post(url, data, auth.genAuthHeaders(accessToken));
        };

        // given a patient and user nested within the patient, try and create a new
        // pharmacy for the patient based on the factory template
        var createPharmacy = function (data, patient) {
            return fixtures.build("Pharmacy", data).then(function (pharmacy) {
                return create(pharmacy, patient._id, patient.user.accessToken);
            });
        };
        // create patient and user automatically
        var createOtherPatientPharmacy = function (access, data) {
            return patients.testOtherPatient({}, access).then(curry(createPharmacy)(data));
        };
        var createMyPatientPharmacy = function (data) {
            return patients.testMyPatient({}).then(curry(createPharmacy)(data));
        };

        // check it requires a valid user and patient
        patients.itRequiresAuthentication(curry(create)({}));
        patients.itRequiresValidPatientId(curry(create)({}));

        it("should let me create valid pharmacies for my patients", function () {
            return expect(createMyPatientPharmacy({})).to.be.a.pharmacy.createSuccess;
        });
        it("should let me create valid pharmacies for a patient shared read-write with me", function () {
            return expect(createOtherPatientPharmacy("write", {})).to.be.a.pharmacy.createSuccess;
        });
        it("should not let me create pharmacies for patients shared read-only", function () {
            return expect(createOtherPatientPharmacy("read", {})).to.be.an.api.error(403, "unauthorized");
        });
        it("should not let me create pharmacies for patients not shared with me", function () {
            return expect(createOtherPatientPharmacy("none", {})).to.be.an.api.error(403, "unauthorized");
        });

        // validation testing
        it("should require a name", function () {
            return expect(createMyPatientPharmacy({ name: undefined })).to.be.an.api.error(400, "name_required");
        });
        it("should not allow a blank name", function () {
            return expect(createMyPatientPharmacy({ name: "" })).to.be.an.api.error(400, "name_required");
        });
        it("should not require anything other than a name", function () {
            return expect(createMyPatientPharmacy({
                phone: undefined,
                address: undefined,
                hours: undefined
            })).to.be.a.pharmacy.createSuccess;
        });
        it("should allow partially filled hours", function () {
            return expect(createMyPatientPharmacy({
                hours: {
                    monday: {
                        open: "09:00"
                    },
                    tuesday: {
                        close: "19:00"
                    }
                }
            })).to.be.a.pharmacy.createSuccess;
        });
    });
});
