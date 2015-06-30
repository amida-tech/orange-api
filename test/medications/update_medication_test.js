"use strict";
var chakram     = require("chakram"),
    curry       = require("curry"),
    Q           = require("q"),
    util        = require("util"),
    auth        = require("../common/auth.js"),
    fixtures    = require("./fixtures.js"),
    patients    = require("../patients/common.js"),
    doctorFixtures  = require("../doctors/fixtures.js"),
    pharmFixtures   = require("../pharmacies/fixtures.js");

var expect = chakram.expect;

describe("Medications", function () {
    describe("Update Single Medication (PUT /patients/:patientid/medications/:medicationid)", function () {
        var update = function (modifications, medicationId, patientId, accessToken) {
            var url = util.format("http://localhost:3000/v1/patients/%d/medications/%d", patientId, medicationId);
            return chakram.put(url, modifications, auth.genAuthHeaders(accessToken));
        };
        var updatePatient = function (modifications, data, patient) {
            var create = Q.nbind(patient.createMedication, patient);
            return fixtures.build("Medication", data).then(function (entry) {
                entry.setData(data);
                return entry.getData();
            }).then(create).then(function (entry) {
                return update(modifications, entry._id, patient._id, patient.user.accessToken);
            });
        };

        patients.itRequiresAuthentication(curry(update)({}, 1));
        patients.itRequiresValidPatientId(curry(update)({}, 1));

        // helpers to update patient and medication
        var updateMyPatientMedication = function (data, modifications) {
            return patients.testMyPatient({}).then(curry(updatePatient)(modifications, data));
        };
        var updateOtherPatientMedication = function (access, data, modifications) {
            return patients.testOtherPatient({}, access).then(curry(updatePatient)(modifications, data));
        };

        it("should let me update medications for my patients", function () {
            return expect(updateMyPatientMedication({}, {})).to.be.a.medication.success;
        });
        it("should not let update view medications for patients shared read-only", function () {
            return expect(updateOtherPatientMedication("read", {}, {})).to.be.an.api.error(403, "unauthorized");
        });
        it("should let me update medications for patients shared read-write", function () {
            return expect(updateOtherPatientMedication("write", {}, {})).to.be.a.medication.success;
        });
        it("should not let me update medications for patients not shared with me", function () {
            return expect(updateOtherPatientMedication("none", {}, {})).to.be.an.api.error(403, "unauthorized");
        });
        it("should not let me update medications for the wrong patient", function () {
            // setup current user and two patients for them, one with a medication
            var user, patient, otherPatient;
            var setup = auth.createTestUser().then(function (u) {
                user = u;
                // create patients
                return Q.all([
                    patients.createMyPatient({}, user),
                    patients.createMyPatient({}, user)
                ]).spread(function (p1, p2) {
                    patient = p1;
                    otherPatient = p2;
                }).then(function () {
                    // setup medication for otherPatient
                    return Q.nbind(otherPatient.createMedication, otherPatient)({ name: "foobar" });
                });
            });

            // check we can't modify otherPatient's medication as patient
            var check = function () {
                var endpoint = update({}, otherPatient.medications[0]._id, patient._id, user.accessToken);
                return expect(endpoint).to.be.an.api.error(404, "invalid_medication_id");
            };

            return setup.then(check);
        });

        it("should not allow a blank name", function () {
            return expect(updateMyPatientMedication({}, { name: "" })).to.be.an.api.error(400, "name_required");
        });

        it("should accept a null fill_date", function () {
            return updateMyPatientMedication({}, { fill_date: null }).then(function (response) {
                expect(response).to.be.a.medication.success;
                expect(response.body.number_left).to.be.null;
            });
        });
        it("should not accept a blank fill_date", function () {
            return expect(updateMyPatientMedication({}, {
                fill_date: ""
            })).to.be.an.api.error(400, "invalid_fill_date");
        });
        it("should not accept an invalid fill_date", function () {
            return expect(updateMyPatientMedication({}, {
                fill_date: "foo"
            })).to.be.an.api.error(400, "invalid_fill_date");
        });
        it("should accept a valid fill_date", function () {
            return updateMyPatientMedication({}, { fill_date: "2015-05-01" }).then(function (response) {
                expect(response).to.be.a.medication.success;
                expect(response.body.number_left).to.not.be.null;
            });
        });

        // dose testing
        it("should not allow a dose without the required keys present", function () {
            return expect(updateMyPatientMedication({}, {
                dose: { not: "valid" }
            })).to.be.an.api.error(400, "invalid_dose");
        });
        it("should not allow a dose without the quantity key present", function () {
            return expect(updateMyPatientMedication({}, {
                dose: { unit: "mg" }
            })).to.be.an.api.error(400, "invalid_dose");
        });
        it("should not allow a dose without the unit key present", function () {
            return expect(updateMyPatientMedication({}, {
                dose: { quantity: 50 }
            })).to.be.an.api.error(400, "invalid_dose");
        });
        it("should not allow a dose with a zero quantity", function () {
            return expect(updateMyPatientMedication({}, {
                dose: { quantity: 0, unit: "mg" }
            })).to.be.an.api.error(400, "invalid_dose");
        });
        it("should not allow a dose with a negative quantity", function () {
            return expect(updateMyPatientMedication({}, {
                dose: { quantity: -50, unit: "mg" }
            })).to.be.an.api.error(400, "invalid_dose");
        });
        it("should not allow a dose with a nonintegral quantity", function () {
            return expect(updateMyPatientMedication({}, {
                dose: { quantity: 5.2, unit: "mg" }
            })).to.be.an.api.error(400, "invalid_dose");
        });
        it("should not allow a dose with a nonnumeric quantity", function () {
            return expect(updateMyPatientMedication({}, {
                dose: { quantity: "foo", unit: "mg" }
            })).to.be.an.api.error(400, "invalid_dose");
        });
        it("should not allow a dose with a blank unit", function () {
            return expect(updateMyPatientMedication({}, {
                dose: { quantity: 50, unit: "" }
            })).to.be.an.api.error(400, "invalid_dose");
        });

        it("should allow null values to reset optional fields", function () {
            return updateMyPatientMedication({}, {
                rx_norm: null,
                fill_date: null,
                ndc: null,
                dose: null,
                route: null,
                form: null,
                rx_number: null,
                quantity: null,
                type: null,
                schedule: null,
                doctor_id: null,
                pharmacy_id: null
            }).then(function (response) {
                expect(response).to.be.a.medication.success;
                expect(response.body.rx_norm).to.equal("");
                expect(response.body.fill_date).to.equal(null);
                expect(response.body.ndc).to.equal("");
                expect(response.body.dose).to.deep.equal({quantity: 1, unit: "dose"});
                expect(response.body.route).to.equal("");
                expect(response.body.form).to.equal("");
                expect(response.body.rx_number).to.equal("");
                expect(response.body.quantity).to.equal(1);
                expect(response.body.type).to.equal("");
                expect(response.body.schedule).to.deep.equal({});
                expect(response.body.doctor_id).to.equal(null);
                expect(response.body.pharmacy_id).to.equal(null);
            });
        });


        it("should not allow an invalid dose", function () {
            return expect(updateMyPatientMedication({}, {
                dose: { not: "valid" }
            })).to.be.an.api.error(400, "invalid_dose");
        });
        it("should not allow a non-object dose", function () {
            return expect(updateMyPatientMedication({}, {
                dose: "foo"
            })).to.be.an.api.error(400, "invalid_dose");
        });
        it("should not allow an invalid quantity", function () {
            return expect(updateMyPatientMedication({}, {
                quantity: -1
            })).to.be.an.api.error(400, "invalid_quantity");
        });
        it("should not allow a nonnumeric quantity", function () {
            return expect(updateMyPatientMedication({}, {
                quantity: "foo"
            })).to.be.an.api.error(400, "invalid_quantity");
        });
        it("should not allow an invalid schedule", function () {
            return expect(updateMyPatientMedication({}, {
                schedule: { type: "invalid" }
            })).to.be.an.api.error(400, "invalid_schedule");
        });
        it("should not allow a non-object schedule", function () {
            return expect(updateMyPatientMedication({}, {
                schedule: "foo"
            })).to.be.an.api.error(400, "invalid_schedule");
        });
        it("should not accept an invalid doctor ID", function () {
            return expect(updateMyPatientMedication({}, {
                doctor_id: "foo"
            })).to.be.an.api.error(400, "invalid_doctor_id");
        });
        it("should not accept a nonexistent doctor ID", function () {
            return expect(updateMyPatientMedication({}, {
                doctor_id: 9999
            })).to.be.an.api.error(400, "invalid_doctor_id");
        });
        it("should not accept an invalid pharmacy ID", function () {
            return expect(updateMyPatientMedication({}, {
                pharmacy_id: "foo"
            })).to.be.an.api.error(400, "invalid_pharmacy_id");
        });
        it("should not accept a nonexistent pharmacy ID", function () {
            return expect(updateMyPatientMedication({}, {
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
                var endpoint = updatePatient({
                    name: "foobar",
                    doctor_id: patient.doctors[0]._id
                }, {}, patient);
                return expect(endpoint).to.be.a.medication.success;
            });
            it("should not accept a doctor ID corresponding to another patient's doctor", function () {
                var endpoint = updatePatient({
                    name: "foobar",
                    doctor_id: otherPatient.doctors[0]._id
                }, {}, patient);
                return expect(endpoint).to.be.an.api.error(400, "invalid_doctor_id");
            });
            it("should accept a pharmacy ID corresponding to a valid pharmacy", function () {
                var endpoint = updatePatient({
                    name: "foobar",
                    pharmacy_id: patient.pharmacies[0]._id
                }, {}, patient);
                return expect(endpoint).to.be.a.medication.success;
            });
            it("should not accept a pharmacy ID corresponding to another patient's pharmacy", function () {
                var endpoint = updatePatient({
                    name: "foobar",
                    pharmacy_id: otherPatient.pharmacies[0]._id
                }, {}, patient);
                return expect(endpoint).to.be.an.api.error(400, "invalid_pharmacy_id");
            });
        });
    });
});
