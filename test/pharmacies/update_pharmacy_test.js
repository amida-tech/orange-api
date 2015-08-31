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
        var updatePatientPharmacy = function (data, modifications) {
            return patients.testMyPatient({}).then(curry(updatePharmacy)(data, modifications));
        };

        // check it requires a valid user and patient
        patients.itRequiresAuthentication(curry(update)({}, 1));
        patients.itRequiresValidPatientId(curry(update)({}, 1));
        common.itRequiresValidPharmacyId(curry(update)({}));
        patients.itRequiresWriteAuthorization(curry(updatePharmacy)({}, {}));

        // access permissions
        it("lets me update pharmacies for my patients", function () {
            return expect(updatePatientPharmacy({}, {})).to.be.a.pharmacy.success;
        });

        // validations
        it("doesn't allow a blank name", function () {
            return expect(updatePatientPharmacy({}, {name: ""})).to.be.an.api.error(400, "name_required");
        });
        it("doesn't allow a null name", function () {
            return expect(updatePatientPharmacy({}, {name: null})).to.be.an.api.error(400, "name_required");
        });

        it("allows nulls to reset fields", function () {
            return updatePatientPharmacy({}, {
                address: null,
                phone: null,
                notes: null,
                hours: null
            }).then(function (response) {
                expect(response.body.address).to.equal("");
                expect(response.body.phone).to.equal("");
                expect(response.body.notes).to.equal("");
                expect(response.body.hours).to.deep.equal({
                    monday: {},
                    tuesday: {},
                    wednesday: {},
                    thursday: {},
                    friday: {},
                    saturday: {},
                    sunday: {}
                });
                expect(response).to.be.a.pharmacy.success;
            });
        });
        it("allows empty values to reset fields", function () {
            // an empty hours value doesn't reset hours, but empty
            // day values inside hours do: see the hours-specific test below
            return updatePatientPharmacy({}, {
                address: "",
                phone: "",
                notes: ""
            }).then(function (response) {
                expect(response.body.address).to.equal("");
                expect(response.body.phone).to.equal("");
                expect(response.body.notes).to.equal("");
                expect(response).to.be.a.pharmacy.success;
            });
        });

        it("merges hours rather than replacing them", function () {
            return updatePatientPharmacy({
                hours: {
                    monday: {
                        open: "09:00 am"
                    },
                    wednesday: {
                        open: "08:00 am",
                        close: "05:00 pm"
                    },
                    thursday: {
                        open: "08:00 am",
                        close: "05:00 pm"
                    },
                    friday: {
                        open: "08:00 am",
                        close: "05:00 pm"
                    }
                }
            }, {
                hours: {
                    monday: {
                        close: "04:00 pm"
                    },
                    tuesday: {
                        close: "04:00 pm"
                    },
                    wednesday: {
                        close: "04:00 pm"
                    },
                    thursday: {},
                    friday: null
                }
            }).then(function (response) {
                expect(response).to.be.a.pharmacy.success;
                expect(response.body.hours).to.deep.equal({
                    monday: {
                        open: "09:00 am",
                        close: "04:00 pm"
                    },
                    tuesday: {
                        close: "04:00 pm"
                    },
                    wednesday: {
                        open: "08:00 am",
                        close: "04:00 pm"
                    },
                    thursday: {
                        open: "08:00 am",
                        close: "05:00 pm"
                    },
                    friday: {},
                    saturday: {},
                    sunday: {}
                });
            });
        });
    });
});
