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
                var output = pharmacy.getData();
                if ("lat" in data) output.lat = data.lat;
                if ("lon" in data) output.lon = data.lon;
                return create(output, patient._id, patient.user.accessToken);
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

        it("lets me create valid pharmacies for my patients", function () {
            return expect(createPatientPharmacy({})).to.be.a.pharmacy.createSuccess;
        });

        // validation testing
        it("requires a name", function () {
            return expect(createPatientPharmacy({ name: undefined })).to.be.an.api.error(400, "name_required");
        });
        it("does not allow a blank name", function () {
            return expect(createPatientPharmacy({ name: "" })).to.be.an.api.error(400, "name_required");
        });
        it("does not allow a null name", function () {
            return expect(createPatientPharmacy({ name: null })).to.be.an.api.error(400, "name_required");
        });
        it("does not require anything other than a name", function () {
            return expect(createPatientPharmacy({
                phone: undefined,
                address: undefined,
                hours: undefined,
                notes: undefined,
                lat: undefined,
                lon: undefined
            })).to.be.a.pharmacy.createSuccess;
        });
        it("does not require non-null fields for anything other than a name", function () {
            return expect(createPatientPharmacy({
                phone: null,
                address: null,
                hours: null,
                notes: null,
                lat: null,
                lon: null
            })).to.be.a.pharmacy.createSuccess;
        });
        it("allows partially filled hours", function () {
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

        it("rejects an empty string lat field", function () {
            return expect(createPatientPharmacy({
                lat: ""
            })).to.be.an.api.error(400, "invalid_lat");
        });
        it("rejects a non-numeric lat field", function () {
            return expect(createPatientPharmacy({
                lat: "foo"
            })).to.be.an.api.error(400, "invalid_lat");
        });
        it("rejects an empty string lon field", function () {
            return expect(createPatientPharmacy({
                lon: ""
            })).to.be.an.api.error(400, "invalid_lon");
        });
        it("rejects a non-numeric lon field", function () {
            return expect(createPatientPharmacy({
                lon: "foo"
            })).to.be.an.api.error(400, "invalid_lon");
        });

        it("doesn't allow setting lat but not lon", function () {
            return expect(createPatientPharmacy({
                lat: 50.0,
                lon: null
            })).to.be.an.api.error(400, "invalid_lon");
        });
        it("doesn't allow setting lon but not lat", function () {
            return expect(createPatientPharmacy({
                lon: 50.0,
                lat: null
            })).to.be.an.api.error(400, "invalid_lat");
        });
    });
});
