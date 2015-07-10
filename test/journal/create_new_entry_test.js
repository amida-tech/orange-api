"use strict";
var chakram         = require("chakram"),
    util            = require("util"),
    curry           = require("curry"),
    Q               = require("q"),
    auth            = require("../common/auth.js"),
    patients        = require("../patients/common.js"),
    medications     = require("../medications/common.js"),
    fixtures        = require("./fixtures.js");

var expect = chakram.expect;

describe("Journal", function () {
    describe("Add New Journal Entry (POST /patients/:patientid/journal)", function () {
        // basic endpoint
        var create = function (data, patientId, accessToken) {
            var url = util.format("http://localhost:3000/v1/patients/%d/journal", patientId);
            return chakram.post(url, data, auth.genAuthHeaders(accessToken));
        };

        // given a patient and user nested within the patient, try and create a new
        // journal entry for the patient based on the factory
        var createEntry = function (data, patient) {
            return fixtures.build("JournalEntry", data).then(function (entry) {
                var output = entry.getData();
                // explicitly set date so we can catch validation errors in the API rather than
                // in fixtures.build
                if ("date" in data) output.date = data.date; // runs on data.date = undefined as well
                // likewise for med IDs
                if ("medication_ids" in data) output.medication_ids = data.medication_ids;
                // likewise for hashtags (to check error)
                if ("hashtags" in data) output.hashtags = data.hashtags;
                return create(output, patient._id, patient.user.accessToken);
            });
        };
        // create patient, user and journal entry automatically
        var createPatientEntry = function (data) {
            return patients.testMyPatient({}).then(curry(createEntry)(data));
        };

        // check it requires a valid user and patient
        patients.itRequiresAuthentication(curry(create)({}));
        patients.itRequiresValidPatientId(curry(create)({}));
        // check it requires write access to patient
        patients.itRequiresWriteAuthorization(curry(createEntry)({}));
        // and all of their medications
        medications.itRequiresWriteAllAuthorization(function (patient, meds) {
            return createEntry({
                medication_ids: meds.map(function (m) { return m._id; })
            }, patient);
        });

        it("should let me create valid entries for my patients", function () {
            return expect(createPatientEntry({})).to.be.a.journal.createSuccess;
        });

        // validation testing
        it("requires a date", function () {
            return expect(createPatientEntry({ date: undefined })).to.be.an.api.error(400, "date_required");
        });
        it("requires a nonblank date", function () {
            return expect(createPatientEntry({ date: "" })).to.be.an.api.error(400, "date_required");
        });
        it("rejects invalid dates", function () {
            return expect(createPatientEntry({ date: "foobar" })).to.be.an.api.error(400, "invalid_date");
        });

        it("requires a text", function () {
            return expect(createPatientEntry({ text: undefined })).to.be.an.api.error(400, "text_required");
        });
        it("requires a nonblank text", function () {
            return expect(createPatientEntry({ text: "" })).to.be.an.api.error(400, "text_required");
        });

        it("doesn't require a mood", function () {
            return expect(createPatientEntry({ mood: undefined })).to.be.a.journal.createSuccess;
        });
        it("allows a blank mood", function () {
            return expect(createPatientEntry({ mood: "" })).to.be.a.journal.createSuccess;
        });
        it("allows a null mood", function () {
            return expect(createPatientEntry({ mood: null })).to.be.a.journal.createSuccess;
        });
        it("allows a mood", function () {
            return expect(createPatientEntry({ mood: "Happy!" })).to.be.a.journal.createSuccess;
        });

        it("allows + parses text with no hashtags in", function () {
            return createPatientEntry({ text: "no hashtags are present in here!" }).then(function (response) {
                expect(response).to.be.a.journal.createSuccess;
                expect(response.body.hashtags).to.deep.equal([]);
            });
        });
        it("allows + parses text with no hashtags in", function () {
            return createPatientEntry({ text: "I #love #my medic#tions and #hashtags!!" }).then(function (response) {
                expect(response).to.be.a.journal.createSuccess;
                expect(response.body.hashtags).to.deep.equal(["love", "my", "hashtags"]);
            });
        });
        it("ignores a hashtags field sent", function () {
            return createPatientEntry({
                text: "I #love #my medic#tions and #hashtags!!",
                hashtags: ["foo", "bar"]
            }).then(function (response) {
                expect(response).to.be.a.journal.createSuccess;
                expect(response.body.hashtags).to.deep.equal(["love", "my", "hashtags"]);
            });
        });
        it("ignores duplicate hashtags", function () {
            return createPatientEntry({
                text: "#hashtags #so #hashtags addictive #hashtags"
            }).then(function (response) {
                expect(response).to.be.a.journal.createSuccess;
                expect(response.body.hashtags).to.deep.equal(["hashtags", "so"]);
            });
        });

        it("allows no medication IDs", function () {
            return expect(createPatientEntry({ medication_ids: undefined })).to.be.a.journal.createSuccess;
        });
        it("allows null medication IDs", function () {
            return expect(createPatientEntry({ medication_ids: null })).to.be.a.journal.createSuccess;
        });
        it("allows empty medication IDs", function () {
            return expect(createPatientEntry({ medication_ids: [] })).to.be.a.journal.createSuccess;
        });
        it("does not allow invalid medication IDs", function () {
            return expect(createPatientEntry({
                medication_ids: ["foo"]
            })).to.be.an.api.error(400, "invalid_medication_id");
        });
        it("does not allow non-array medication IDs", function () {
            return expect(createPatientEntry({
                medication_ids: "bar"
            })).to.be.an.api.error(400, "invalid_medication_id");
        });
        it("does not allow medication IDs not corresponding to real medications", function() {
            return expect(createPatientEntry({
                medication_ids: [9999]
            })).to.be.an.api.error(400, "invalid_medication_id");
        });
        describe("with medications setup", function () {
            var user, patient, otherPatient;
            before(function () {
                // setup current user and two patients for them, both with a medication
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
                        var medication = Q.nbind(patient.createMedication, patient)({ name: "foobar" });
                        var otherMedication = Q.nbind(otherPatient.createMedication, otherPatient)({ name: "foobar" });
                        return medication.then(otherMedication);
                    });
                });
            });
            it("does not allow medication IDs corresponding to medications owned by other patients", function () {
                var endpoint = create({
                    text: "foobar",
                    date: (new Date()).toISOString(),
                    medication_ids: [otherPatient.medications[0]._id]
                }, patient._id, patient.user.accessToken);
                return expect(endpoint).to.be.an.api.error(400, "invalid_medication_id");
            });
            it("allows medication IDs corresponding to the current patient", function () {
                var endpoint = create({
                    text: "foobar",
                    date: (new Date()).toISOString(),
                    medication_ids: [patient.medications[0]._id]
                }, patient._id, patient.user.accessToken);
                return expect(endpoint).to.be.a.journal.createSuccess;
            });
        });
    });
});
