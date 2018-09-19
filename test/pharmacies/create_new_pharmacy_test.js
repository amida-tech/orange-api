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
            var url = util.format("http://localhost:5000/v1/patients/%d/pharmacies", patientId);
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
                notes: undefined
            })).to.be.a.pharmacy.createSuccess;
        });
        it("does not require non-null fields for anything other than a name", function () {
            return expect(createPatientPharmacy({
                phone: null,
                address: null,
                hours: null,
                notes: null
            })).to.be.a.pharmacy.createSuccess;
        });
        it("allows partially filled hours", function () {
            return expect(createPatientPharmacy({
                hours: {
                    monday: {
                        open: "09:00 am"
                    },
                    tuesday: {
                        close: "07:00 pm"
                    }
                }
            })).to.be.a.pharmacy.createSuccess;
        });
        it("allows a blank notes field", function () {
            return expect(createPatientPharmacy({
                notes: ""
            })).to.be.a.pharmacy.createSuccess;
        });

        // TODO: Get google api key and use for geolocation
        // it("geocodes successfully", function () {
        //     return createPatientPharmacy({
        //         address: "3 Ames Street, Cambridge, MA, 02142"
        //     }).then(function (response) {
        //         expect(response.body.lat).to.not.be.null;
        //         expect(response.body.lon).to.not.be.null;
        //         expect(response.body.lat).to.be.within(42.3, 43.4);
        //         expect(response.body.lon).to.be.within(-71.1, -71.0);
        //     });
        // });
        // it("handles invalid addresses when geocoding", function () {
        //     return createPatientPharmacy({
        //         address: "aiyo78s6r728yiu4h3kjwrelsf"
        //     }).then(function (response) {
        //         expect(response.body.lat).to.be.null;
        //         expect(response.body.lon).to.be.null;
        //     });
        // });
    });
});
