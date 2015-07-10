"use strict";
var chakram         = require("chakram"),
    util            = require("util"),
    curry           = require("curry"),
    auth            = require("../common/auth.js"),
    patients        = require("../patients/common.js"),
    fixtures        = require("./fixtures.js");

var expect = chakram.expect;

describe("Pharmacies", function () {
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
        var createPatientPharmacy = function (data) {
            return patients.testMyPatient({}).then(curry(createPharmacy)(data));
        };

        // check it requires a valid user and patient
        patients.itRequiresAuthentication(curry(create)({}));
        patients.itRequiresValidPatientId(curry(create)({}));
        patients.itRequiresWriteAuthorization(curry(createPharmacy)({}));

        it("should let me create valid pharmacies for my patients", function () {
            return expect(createPatientPharmacy({})).to.be.a.pharmacy.createSuccess;
        });

        // validation testing
        it("should require a name", function () {
            return expect(createPatientPharmacy({ name: undefined })).to.be.an.api.error(400, "name_required");
        });
        it("should not allow a blank name", function () {
            return expect(createPatientPharmacy({ name: "" })).to.be.an.api.error(400, "name_required");
        });
        it("should not allow a null name", function () {
            return expect(createPatientPharmacy({ name: null })).to.be.an.api.error(400, "name_required");
        });
        it("should not require anything other than a name", function () {
            return expect(createPatientPharmacy({
                phone: undefined,
                address: undefined,
                hours: undefined,
                notes: undefined
            })).to.be.a.pharmacy.createSuccess;
        });
        it("should not require non-null fields for anything other than a name", function () {
            return expect(createPatientPharmacy({
                phone: null,
                address: null,
                hours: null,
                notes: null
            })).to.be.a.pharmacy.createSuccess;
        });
        it("should allow partially filled hours", function () {
            return expect(createPatientPharmacy({
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
        it("allows a blank notes field", function () {
            return expect(createPatientPharmacy({
                notes: ""
            })).to.be.a.pharmacy.createSuccess;
        });
    });
});
