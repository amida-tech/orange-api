"use strict";
var chakram         = require("chakram"),
    util            = require("util"),
    mongoose        = require("mongoose"),
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
        var createPatientMedication = function (data) {
            return patients.testMyPatient({}).then(curry(createMedication)(data));
        };

        // check it requires a valid user and patient, and write access to that patient
        patients.itRequiresAuthentication(curry(create)({}));
        patients.itRequiresValidPatientId(curry(create)({}));
        patients.itRequiresWriteAuthorization(curry(createMedication)({}));

        it("lets me create valid medications for my patients", function () {
            return expect(createPatientMedication({})).to.be.a.medication.createSuccess;
        });

        // validation testing
        // schedule testing done in detail in schedule_validation_test.js
        it("requires a name", function () {
            return expect(createPatientMedication({ name: undefined })).to.be.an.api.error(400, "name_required");
        });
        it("does not allow a blank name", function () {
            return expect(createPatientMedication({ name: "" })).to.be.an.api.error(400, "name_required");
        });
        it("does not allow a null name", function () {
            return expect(createPatientMedication({ name: null })).to.be.an.api.error(400, "name_required");
        });
        it("does not require anything other than a name", function () {
            return expect(createPatientMedication({
                rx_norm: undefined,
                ndc: undefined,
                dose: undefined,
                route: undefined,
                form: undefined,
                rx_number: undefined,
                quantity: undefined,
                fill_date: undefined,
                type: undefined,
                brand: undefined,
                origin: undefined,
                schedule: undefined,
                doctor_id: undefined,
                pharmacy_id: undefined,
                access_anyone: undefined,
                access_family: undefined,
                access_prime: undefined,
                import_id: undefined,
                notes: undefined
            })).to.be.a.medication.createSuccess;
        });
        it("allows null values for everything other than name and access_X", function () {
            return expect(createPatientMedication({
                rx_norm: null,
                ndc: null,
                dose: null,
                route: null,
                form: null,
                rx_number: null,
                quantity: null,
                fill_date: null,
                type: null,
                brand: null,
                origin: null,
                schedule: null,
                doctor_id: null,
                pharmacy_id: null,
                import_id: null,
                notes: null
            })).to.be.a.medication.createSuccess;
        });
        // for these tests we know the fixture has a valid quantity so can assert the
        // presence of number_left
        it("accepts a blank notes field", function () {
            return createPatientMedication({ notes: "" }).then(function (response) {
                expect(response).to.be.a.medication.createSuccess;
                expect(response.body.notes).to.equal("");
            });
        });
        it("accepts a non-black notes field", function () {
            return createPatientMedication({ notes: "lorem ipsum" }).then(function (response) {
                expect(response).to.be.a.medication.createSuccess;
                expect(response.body.notes).to.equal("lorem ipsum");
            });
        });
        it("accepts a null fill_date", function () {
            return createPatientMedication({ fill_date: null }).then(function (response) {
                expect(response).to.be.a.medication.createSuccess;
                expect(response.body.number_left).to.be.null;
            });
        });
        it("rejects a blank fill_date", function () {
            return expect(createPatientMedication({
                fill_date: ""
            })).to.be.an.api.error(400, "invalid_fill_date");
        });
        it("rejects an invalid fill_date", function () {
            return expect(createPatientMedication({
                fill_date: "foo"
            })).to.be.an.api.error(400, "invalid_fill_date");
        });
        it("accepts a valid fill_date", function () {
            return createPatientMedication({ fill_date: "2015-05-01" }).then(function (response) {
                expect(response).to.be.a.medication.createSuccess;
                expect(response.body.number_left).to.not.be.null;
            });
        });

        it("accepts a blank `origin`", function () {
            return createPatientMedication({ origin: "" }).then(function (response) {
                expect(response).to.be.a.medication.createSuccess;
                expect(response.body.origin).to.equal("");
            });
        });
        it("accepts a null `origin` and converts it to a blank string", function () {
            return createPatientMedication({ origin: null }).then(function (response) {
                expect(response).to.be.a.medication.createSuccess;
                expect(response.body.origin).to.equal("");
            });
        });
        it("defaults to a blank string for `origin`", function () {
            return createPatientMedication({ origin: undefined }).then(function (response) {
                expect(response).to.be.a.medication.createSuccess;
                expect(response.body.origin).to.equal("");
            });
        });
        it("accepts a valid string for `origin`", function () {
            return createPatientMedication({ origin: "manual" }).then(function (response) {
                expect(response).to.be.a.medication.createSuccess;
                expect(response.body.origin).to.equal("manual");
            });
        });

        it("accepts an undefined `import_id` and converts it to null", function () {
            return createPatientMedication({ import_id: undefined }).then(function (response) {
                expect(response).to.be.a.medication.createSuccess;
                expect(response.body.import_id).to.equal(null);
            });
        });
        it("accepts a null `import_id`", function () {
            return createPatientMedication({ import_id: null }).then(function (response) {
                expect(response).to.be.a.medication.createSuccess;
                expect(response.body.import_id).to.equal(null);
            });
        });
        it("rejects a blank string `import_id`", function () {
            return expect(createPatientMedication({ import_id: "" })).to.be.an.api.error(400, "invalid_import_id");
        });
        it("accepts a numerical `import_id`", function () {
            return createPatientMedication({ import_id: 5 }).then(function (response) {
                expect(response).to.be.a.medication.createSuccess;
                expect(response.body.import_id).to.equal(5);
            });
        });
        it("rejects a string `import_id`", function () {
            return expect(createPatientMedication({ import_id: "foo" })).to.be.an.api.error(400, "invalid_import_id");
        });

        // dose testing
        it("does not allow a dose without the required keys present", function () {
            return expect(createPatientMedication({
                dose: { not: "valid" }
            })).to.be.an.api.error(400, "invalid_dose");
        });
        it("does not allow a dose without the quantity key present", function () {
            return expect(createPatientMedication({
                dose: { unit: "mg" }
            })).to.be.an.api.error(400, "invalid_dose");
        });
        it("does not allow a dose without the unit key present", function () {
            return expect(createPatientMedication({
                dose: { quantity: 50 }
            })).to.be.an.api.error(400, "invalid_dose");
        });
        it("does not allow a dose with a zero quantity", function () {
            return expect(createPatientMedication({
                dose: { quantity: 0, unit: "mg" }
            })).to.be.an.api.error(400, "invalid_dose");
        });
        it("does not allow a dose with a negative quantity", function () {
            return expect(createPatientMedication({
                dose: { quantity: -50, unit: "mg" }
            })).to.be.an.api.error(400, "invalid_dose");
        });
        it("accepts a dose with a nonintegral quantity", function () {
            return expect(createPatientMedication({
                dose: { quantity: 5.2, unit: "mg" }
            })).to.be.a.medication.createSuccess;
        });
        it("does not allow a dose with a nonnumeric quantity", function () {
            return expect(createPatientMedication({
                dose: { quantity: "foo", unit: "mg" }
            })).to.be.an.api.error(400, "invalid_dose");
        });
        it("does not allow a dose with a blank unit", function () {
            return expect(createPatientMedication({
                dose: { quantity: 50, unit: "" }
            })).to.be.an.api.error(400, "invalid_dose");
        });

        it("does not allow an invalid dose", function () {
            return expect(createPatientMedication({
                dose: { not: "valid" }
            })).to.be.an.api.error(400, "invalid_dose");
        });
        it("does not allow a non-object dose", function () {
            return expect(createPatientMedication({
                dose: "foo"
            })).to.be.an.api.error(400, "invalid_dose");
        });
        it("does not allow an invalid quantity", function () {
            return expect(createPatientMedication({
                quantity: -1
            })).to.be.an.api.error(400, "invalid_quantity");
        });
        it("does not allow a nonnumeric quantity", function () {
            return expect(createPatientMedication({
                quantity: "foo"
            })).to.be.an.api.error(400, "invalid_quantity");
        });
        it("does not allow an invalid schedule", function () {
            return expect(createPatientMedication({
                schedule: { type: "invalid" }
            })).to.be.an.api.error(400, "invalid_schedule");
        });
        it("does not allow a non-object schedule", function () {
            return expect(createPatientMedication({
                schedule: "foo"
            })).to.be.an.api.error(400, "invalid_schedule");
        });
        it("rejects an invalid doctor ID", function () {
            return expect(createPatientMedication({
                doctor_id: "foo"
            })).to.be.an.api.error(400, "invalid_doctor_id");
        });
        it("rejects a nonexistent doctor ID", function () {
            return expect(createPatientMedication({
                doctor_id: 9999
            })).to.be.an.api.error(400, "invalid_doctor_id");
        });
        it("rejects an invalid pharmacy ID", function () {
            return expect(createPatientMedication({
                pharmacy_id: "foo"
            })).to.be.an.api.error(400, "invalid_pharmacy_id");
        });
        it("rejects a nonexistent pharmacy ID", function () {
            return expect(createPatientMedication({
                pharmacy_id: 9999
            })).to.be.an.api.error(400, "invalid_pharmacy_id");
        });

        // checking valid access_X required
        it("rejects a null value for access_X", function () {
            return expect(createPatientMedication({
                access_anyone: null
            })).to.be.an.api.error(400, "invalid_access_anyone");
        });
        it("rejects a blank value for access_X", function () {
            return expect(createPatientMedication({
                access_anyone: ""
            })).to.be.an.api.error(400, "invalid_access_anyone");
        });
        it("rejects an invalid value for access_X", function () {
            return expect(createPatientMedication({
                access_anyone: "foo"
            })).to.be.an.api.error(400, "invalid_access_anyone");
        });
        it("accepts 'read' for access_X", function () {
            return expect(createPatientMedication({
                access_anyone: "read"
            })).to.be.a.medication.createSuccess;
        });
        it("accepts 'write' for access_X", function () {
            return expect(createPatientMedication({
                access_anyone: "write"
            })).to.be.a.medication.createSuccess;
        });
        it("accepts 'default' for access_X", function () {
            return expect(createPatientMedication({
                access_anyone: "default"
            })).to.be.a.medication.createSuccess;
        });
        it("accepts 'none' for access_X", function () {
            return expect(createPatientMedication({
                access_anyone: "none"
            })).to.be.a.medication.createSuccess;
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


            it("accepts a doctor ID corresponding to a valid doctor", function () {
                var endpoint = create({
                    name: "foobar",
                    doctor_id: patient.doctors[0]._id
                }, patient._id, patient.user.accessToken);
                return expect(endpoint).to.be.a.medication.createSuccess;
            });
            it("rejects a doctor ID corresponding to another patient's doctor", function () {
                var endpoint = create({
                    name: "foobar",
                    doctor_id: otherPatient.doctors[0]._id
                }, patient._id, patient.user.accessToken);
                return expect(endpoint).to.be.an.api.error(400, "invalid_doctor_id");
            });
            it("accepts a pharmacy ID corresponding to a valid pharmacy", function () {
                var endpoint = create({
                    name: "foobar",
                    pharmacy_id: patient.pharmacies[0]._id
                }, patient._id, patient.user.accessToken);
                return expect(endpoint).to.be.a.medication.createSuccess;
            });
            it("rejects a pharmacy ID corresponding to another patient's pharmacy", function () {
                var endpoint = create({
                    name: "foobar",
                    pharmacy_id: otherPatient.pharmacies[0]._id
                }, patient._id, patient.user.accessToken);
                return expect(endpoint).to.be.an.api.error(400, "invalid_pharmacy_id");
            });
        });

        describe("testing medication merging", function () {
            // setup test user and patient
            var user, patient;
            before(function () {
                return auth.createTestUser().then(function (u) {
                    user = u;
                }).then(function () {
                    return patients.createMyPatient({}, user);
                }).then(function (p) {
                    patient = p;
                });
            });

            // setup an existing medication: one imported and one manually created
            var manualMedId, importedMedId;
            before(function () {
                return create({
                    name: "Loratadine",
                    brand: "Claritin-D",
                    origin: "imported",
                    import_id: 3
                }, patient._id, patient.user.accessToken).then(function (response) {
                    importedMedId = response.body.id;
                });
            });
            before(function () {
                return create({
                    name: "Fexofenadine",
                    origin: "manual"
                }, patient._id, patient.user.accessToken).then(function (response) {
                    manualMedId = response.body.id;
                });
            });
            // count number of medications present to check we're modifying not adding when
            // merging
            var countMeds = function () {
                var Patient = mongoose.model("Patient");
                return Q.nbind(Patient.findById, Patient)(patient._id).then(function (p) {
                    return p.medications.length;
                });
            };
            var medCount;
            before(function () {
                return countMeds().then(function (count) {
                    medCount = count;
                });
            });

            // create a new manual medication and check we get a new med created
            it("doesn't merge for manual meds", function () {
                // same name as previous manual med
                return create({
                    name: "Fexofenadine",
                    origin: "manual"
                }, patient._id, patient.user.accessToken).then(function (response) {
                    expect(response).to.be.a.medication.createSuccess;
                    expect(response.body.id).to.not.equal(manualMedId);
                    expect(response.body.id).to.not.equal(importedMedId);
                    return countMeds().then(function (count) {
                        expect(count).to.equal(medCount + 1);
                        medCount = count;
                    });
                });
            });

            // create a new imported medication with no import_id and check we get a new med created
            it("doesn't merge for imported meds with no import_id", function () {
                // same details as previous imported med
                return create({
                    name: "Loratadine",
                    brand: "Claritin-D",
                    origin: "imported"
                }, patient._id, patient.user.accessToken).then(function (response) {
                    expect(response).to.be.a.medication.createSuccess;
                    expect(response.body.id).to.not.equal(manualMedId);
                    expect(response.body.id).to.not.equal(importedMedId);
                    return countMeds().then(function (count) {
                        expect(count).to.equal(medCount + 1);
                        medCount = count;
                    });
                });
            });

            // create a new imported medication with no import_id again and check it isn't merged
            it("doesn't merge for multiple imported meds with no import_id", function () {
                // same details as previous imported med
                return create({
                    name: "Loratadine",
                    brand: "Claritin-D",
                    origin: "imported"
                }, patient._id, patient.user.accessToken).then(function (response) {
                    expect(response).to.be.a.medication.createSuccess;
                    return countMeds().then(function (count) {
                        expect(count).to.equal(medCount + 1);
                        medCount = count;
                    });
                });
            });

            // create a new imported medication with a different import_id and check we get a new
            // med created
            it("doesn't merge for imported meds with a different import_id", function () {
                // same details as previous imported med
                return create({
                    name: "Loratadine",
                    brand: "Claritin-D",
                    origin: "imported",
                    import_id: 7
                }, patient._id, patient.user.accessToken).then(function (response) {
                    expect(response).to.be.a.medication.createSuccess;
                    expect(response.body.id).to.not.equal(manualMedId);
                    expect(response.body.id).to.not.equal(importedMedId);
                    return countMeds().then(function (count) {
                        expect(count).to.equal(medCount + 1);
                        medCount = count;
                    });
                });
            });

            // create a new imported medication with the same import_id and check it *is* merged
            it("merges for imported meds with the same import_id", function () {
                return create({
                    name: "ANewName",
                    origin: "imported",
                    import_id: 3
                }, patient._id, patient.user.accessToken).then(function (response) {
                    expect(response).to.be.a.medication.createSuccess;

                    // check new details have been updated
                    expect(response.body.name).to.equal("ANewName");
                    // check old details have been preserved
                    expect(response.body.brand).to.equal("Claritin-D");
                    expect(response.body.id).to.equal(importedMedId);

                    // check the med has been updated and no new one created
                    return countMeds().then(function (count) {
                        expect(count).to.equal(medCount);
                    });
                });
            });
        });
    });
});

