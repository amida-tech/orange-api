"use strict";
var chakram         = require("chakram"),
    util            = require("util"),
    curry           = require("curry"),
    Q               = require("q"),
    auth            = require("../common/auth.js"),
    patients        = require("../patients/common.js"),
    doctorFixtures  = require("../doctors/fixtures.js"),
    pharmFixtures   = require("../pharmacies/fixtures.js");

var expect = chakram.expect;

describe("Medications", function () {
    describe("Create New Medication (/patients/:patientid/medications)", function () {
        // basic endpoint
        var create = function (data, patientId, accessToken) {
            var url = util.format("http://localhost:3000/v1/patients/%d/medications", patientId);
            return chakram.post(url, data, auth.genAuthHeaders(accessToken));
        };

        // given a patient and user nested within the patient, try and create a new
        // medication for the patient based on the factory template
        var createMedication = function (data, patient) {
            // we don't use a fixture here because of complicated camelcase/snakecase,
            // casting, etc, so instead we just hackishly add name to data if not
            // already present
            if (!("name" in data)) data.name = "foobar";

            return create(data, patient._id, patient.user.accessToken);
        };

        // helpers to create patients before creating a medication for them
        var createOtherPatientMedication = function (access, data) {
            return patients.testOtherPatient({}, access).then(curry(createMedication)(data));
        };
        var createMyPatientMedication = function (data) {
            return patients.testMyPatient({}).then(curry(createMedication)(data));
        };

        // check it requires a valid user and patient
        patients.itRequiresAuthentication(curry(create)({}));
        patients.itRequiresValidPatientId(curry(create)({}));

        it("should let me create valid medications for my patients", function () {
            return expect(createMyPatientMedication({})).to.be.a.medication.createSuccess;
        });
        it("should let me create valid medications for a patient shared read-write with me", function () {
            return expect(createOtherPatientMedication("write", {})).to.be.a.medication.createSuccess;
        });
        it("should not let me create a medication for a patient shared read-only", function () {
            return expect(createOtherPatientMedication("read", {})).to.be.an.api.error(403, "unauthorized");
        });
        it("should not let me create a medication for a patient not shared with me", function () {
            return expect(createOtherPatientMedication("none", {})).to.be.an.api.error(403, "unauthorized");
        });

        // validation testing
        // schedule testing done in detail in schedule_validation_test.js
        it("should require a name", function () {
            return expect(createMyPatientMedication({ name: undefined })).to.be.an.api.error(400, "name_required");
        });
        it("should not allow a blank name", function () {
            return expect(createMyPatientMedication({ name: "" })).to.be.an.api.error(400, "name_required");
        });
        it("should not allow a null name", function () {
            return expect(createMyPatientMedication({ name: null })).to.be.an.api.error(400, "name_required");
        });
        it("should not require anything other than a name", function () {
            return expect(createMyPatientMedication({
                rx_norm: undefined,
                ndc: undefined,
                dose: undefined,
                route: undefined,
                form: undefined,
                rx_number: undefined,
                quantity: undefined,
                fill_date: undefined,
                type: undefined,
                schedule: undefined,
                doctor_id: undefined,
                pharmacy_id: undefined
            })).to.be.a.medication.createSuccess;
        });
        it("should allow null values for everything other than name", function () {
            return expect(createMyPatientMedication({
                rx_norm: null,
                ndc: null,
                dose: null,
                route: null,
                form: null,
                rx_number: null,
                quantity: null,
                fill_date: null,
                type: null,
                schedule: null,
                doctor_id: null,
                pharmacy_id: null
            })).to.be.a.medication.createSuccess;
        });
        // for these tests we know the fixture has a valid quantity so can assert the
        // presence of number_left
        it("should accept a null fill_date", function () {
            return createMyPatientMedication({ fill_date: null }).then(function (response) {
                expect(response).to.be.a.medication.createSuccess;
                expect(response.body.number_left).to.be.null;
            });
        });
        it("should not accept a blank fill_date", function () {
            return expect(createMyPatientMedication({
                fill_date: ""
            })).to.be.an.api.error(400, "invalid_fill_date");
        });
        it("should not accept an invalid fill_date", function () {
            return expect(createMyPatientMedication({
                fill_date: "foo"
            })).to.be.an.api.error(400, "invalid_fill_date");
        });
        it("should accept a valid fill_date", function () {
            return createMyPatientMedication({ fill_date: "2015-05-01" }).then(function (response) {
                expect(response).to.be.a.medication.createSuccess;
                expect(response.body.number_left).to.not.be.null;
            });
        });

        // dose testing
        it("should not allow a dose without the required keys present", function () {
            return expect(createMyPatientMedication({
                dose: { not: "valid" }
            })).to.be.an.api.error(400, "invalid_dose");
        });
        it("should not allow a dose without the quantity key present", function () {
            return expect(createMyPatientMedication({
                dose: { unit: "mg" }
            })).to.be.an.api.error(400, "invalid_dose");
        });
        it("should not allow a dose without the unit key present", function () {
            return expect(createMyPatientMedication({
                dose: { quantity: 50 }
            })).to.be.an.api.error(400, "invalid_dose");
        });
        it("should not allow a dose with a zero quantity", function () {
            return expect(createMyPatientMedication({
                dose: { quantity: 0, unit: "mg" }
            })).to.be.an.api.error(400, "invalid_dose");
        });
        it("should not allow a dose with a negative quantity", function () {
            return expect(createMyPatientMedication({
                dose: { quantity: -50, unit: "mg" }
            })).to.be.an.api.error(400, "invalid_dose");
        });
        it("should not allow a dose with a nonintegral quantity", function () {
            return expect(createMyPatientMedication({
                dose: { quantity: 5.2, unit: "mg" }
            })).to.be.an.api.error(400, "invalid_dose");
        });
        it("should not allow a dose with a nonnumeric quantity", function () {
            return expect(createMyPatientMedication({
                dose: { quantity: "foo", unit: "mg" }
            })).to.be.an.api.error(400, "invalid_dose");
        });
        it("should not allow a dose with a blank unit", function () {
            return expect(createMyPatientMedication({
                dose: { quantity: 50, unit: "" }
            })).to.be.an.api.error(400, "invalid_dose");
        });


        it("should not allow an invalid dose", function () {
            return expect(createMyPatientMedication({
                dose: { not: "valid" }
            })).to.be.an.api.error(400, "invalid_dose");
        });
        it("should not allow a non-object dose", function () {
            return expect(createMyPatientMedication({
                dose: "foo"
            })).to.be.an.api.error(400, "invalid_dose");
        });
        it("should not allow an invalid quantity", function () {
            return expect(createMyPatientMedication({
                quantity: -1
            })).to.be.an.api.error(400, "invalid_quantity");
        });
        it("should not allow a nonnumeric quantity", function () {
            return expect(createMyPatientMedication({
                quantity: "foo"
            })).to.be.an.api.error(400, "invalid_quantity");
        });
        it("should not allow an invalid schedule", function () {
            return expect(createMyPatientMedication({
                schedule: { type: "invalid" }
            })).to.be.an.api.error(400, "invalid_schedule");
        });
        it("should not allow a non-object schedule", function () {
            return expect(createMyPatientMedication({
                schedule: "foo"
            })).to.be.an.api.error(400, "invalid_schedule");
        });
        it("should not accept an invalid doctor ID", function () {
            return expect(createMyPatientMedication({
                doctor_id: "foo"
            })).to.be.an.api.error(400, "invalid_doctor_id");
        });
        it("should not accept a nonexistent doctor ID", function () {
            return expect(createMyPatientMedication({
                doctor_id: 9999
            })).to.be.an.api.error(400, "invalid_doctor_id");
        });
        it("should not accept an invalid pharmacy ID", function () {
            return expect(createMyPatientMedication({
                pharmacy_id: "foo"
            })).to.be.an.api.error(400, "invalid_pharmacy_id");
        });
        it("should not accept a nonexistent pharmacy ID", function () {
            return expect(createMyPatientMedication({
                pharmacy_id: 9999
            })).to.be.an.api.error(400, "invalid_pharmacy_id");
        });

        describe("testing valid doctor and pharmacy IDs", function () {
            // helper function to create a doctor and a pharmacy for a given patient
            var createDoctorPharmacy = function (p) {
                var createDoctor = doctorFixtures.build("Doctor").then(Q.nbind(p.createDoctor, p));
                var createPharmacy = pharmFixtures.build("Pharmacy").then(Q.nbind(p.createPharmacy, p));
                return createDoctor.then(createPharmacy);
            };

            // setup current user and two patients for them, both with a doctor and pharmacy
            var user, patient, otherPatient;
            before(function () {
                return auth.createTestUser().then(function (u) {
                    user = u;
                    // create patients
                    return Q.all([
                        patients.createMyPatient({}, user),
                        patients.createMyPatient({}, user)
                    ]).spread(function (p1, p2) {
                        patient = p1;
                        otherPatient = p2;
                    }).then(function () {
                        // create doctor and pharmacy
                        return createDoctorPharmacy(patient).then(createDoctorPharmacy(otherPatient));
                    });
                });
            });


            it("should accept a doctor ID corresponding to a valid doctor", function () {
                var endpoint = create({
                    name: "foobar",
                    doctor_id: patient.doctors[0]._id
                }, patient._id, patient.user.accessToken);
                return expect(endpoint).to.be.a.medication.createSuccess;
            });
            it("should not accept a doctor ID corresponding to another patient's doctor", function () {
                var endpoint = create({
                    name: "foobar",
                    doctor_id: otherPatient.doctors[0]._id
                }, patient._id, patient.user.accessToken);
                return expect(endpoint).to.be.an.api.error(400, "invalid_doctor_id");
            });
            it("should accept a pharmacy ID corresponding to a valid pharmacy", function () {
                var endpoint = create({
                    name: "foobar",
                    pharmacy_id: patient.pharmacies[0]._id
                }, patient._id, patient.user.accessToken);
                return expect(endpoint).to.be.a.medication.createSuccess;
            });
            it("should not accept a pharmacy ID corresponding to another patient's pharmacy", function () {
                var endpoint = create({
                    name: "foobar",
                    pharmacy_id: otherPatient.pharmacies[0]._id
                }, patient._id, patient.user.accessToken);
                return expect(endpoint).to.be.an.api.error(400, "invalid_pharmacy_id");
            });
        });
    });
});

