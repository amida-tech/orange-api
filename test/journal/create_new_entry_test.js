"use strict";
var chakram = require("chakram"),
    util = require("util"),
    curry = require("curry"),
    Q = require("q"),
    auth = require("../common/auth.js"),
    patients = require("../patients/common.js"),
    medications = require("../medications/common.js"),
    fixtures = require("./fixtures.js");

var expect = chakram.expect;

describe("Journal", function () {
    describe("Add New Journal Entry (POST /patients/:patientid/journal)", function () {
        // basic endpoint
        var create = function (data, patientId, accessToken) {
            var url = util.format("http://localhost:5000/v1/patients/%d/journal", patientId);
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
                //likewise for meditation
                if ("meditation" in data) output.meditation = data.meditation;
                //likewise for meditationLength
                if ("meditationLength" in data) output.meditationLength = data.meditationLength;
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

        it("lets me create valid entries for my patients", function () {
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

        it("doesn't require a text", function () {
            return expect(createPatientEntry({ text: undefined })).to.be.a.journal.createSuccess;
        });
        it("allows a blank text", function () {
            return expect(createPatientEntry({ text: "" })).to.be.an.journal.createSuccess;
        });

        //moods
        it("doesn't require a mood", function () {
            return expect(createPatientEntry({ mood: undefined, moodSeverity: undefined })).to.be.a.journal.createSuccess;
        });
        it("allows a blank mood", function () {
            return expect(createPatientEntry({ mood: "", moodSeverity: undefined })).to.be.a.journal.createSuccess;
        });
        it("allows a null mood", function () {
            return expect(createPatientEntry({ mood: null, moodSeverity: undefined })).to.be.a.journal.createSuccess;
        });
        it("allows a mood", function () {
            return expect(createPatientEntry({ mood: "Happy!" })).to.be.a.journal.createSuccess;
        });
        //moodSeverity
        //no mood
        describe("When mood is not defined", function() {
            it("doesn't require a moodSeverity", function () {
                return expect(createPatientEntry({ mood: undefined, moodSeverity: undefined })).to.be.a.journal.createSuccess;
            });
            it("allows a null moodSeverity", function () {
                return expect(createPatientEntry({ mood: undefined, moodSeverity: null })).to.be.a.journal.createSuccess;
            });
            it("rejects a moodSeverity", function () {
                return expect(createPatientEntry({ mood: undefined, moodSeverity: 5 })).to.be.an.api.error(400, "invalid_mood");
            });
        });
        //yes mood
        describe("When mood is defined", function() {
            it("requires a moodSeverity", function () {
                return expect(createPatientEntry({ mood: "Happy!", moodSeverity: undefined })).to.be.an.api.error(400, "invalid_mood");
            });
            it("rejects a null moodSeverity", function () {
                return expect(createPatientEntry({ mood: "Happy!", moodSeverity: null })).to.be.an.api.error(400, "invalid_mood");
            });
            it("allows a moodSeverity", function () {
                return expect(createPatientEntry({ mood: "Happy!", moodSeverity: 5 })).to.be.a.journal.createSuccess;
            });
            it("rejects a moodSeverity below 1", function () {
                return expect(createPatientEntry({ mood: "Happy!", moodSeverity: 0 })).to.be.an.api.error(400, "invalid_mood");
            });
            it("rejects a moodSeverity above 10", function () {
                return expect(createPatientEntry({ mood: "Happy!", moodSeverity: 11 })).to.be.an.api.error(400, "invalid_mood");
            });
        });


        //moodEmoji
        it("doesn't require a mood Emoji", function () {
            return expect(createPatientEntry({ moodEmoji: undefined })).to.be.a.journal.createSuccess;
        });
        it("rejects a blank mood Emoji", function () {
            return expect(createPatientEntry({ moodEmoji: "" })).to.be.an.api.error(400, "invalid_emoji");
        });
        it("allows a null mood Emoji", function () {
            return expect(createPatientEntry({ moodEmoji: null })).to.be.a.journal.createSuccess;
        });
        it("allows a unicode mood Emoji", function () {
            return createPatientEntry({ moodEmoji: "\\U0001F625" })
                .then(function (response) {
                    expect(response).to.be.a.journal.createSuccess;
                    expect(response.body.moodEmoji).to.equal("\\U0001F625");
                });
        });
        it("does not allow mood Emoji non-unicode string", function () {
            return expect(createPatientEntry({ moodEmoji: "abcd12345" })).to.be.an.api.error(400, "invalid_emoji");
        });

        it("does not allow mood Emoji string with invalid length", function () {
            return expect(createPatientEntry({ moodEmoji: "\\U1234567890" })).to.be.an.api.error(400, "invalid_emoji");
        });

        //sideEffect
        it("doesn't require a sideEffect", function () {
            return expect(createPatientEntry({ sideEffect: undefined, sideEffectSeverity: undefined })).to.be.a.journal.createSuccess;
        });
        it("allows a blank sideEffect", function () {
            return expect(createPatientEntry({ sideEffect: "", sideEffectSeverity: undefined })).to.be.a.journal.createSuccess;
        });
        it("allows a null sideEffect", function () {
            return expect(createPatientEntry({ sideEffect: null, sideEffectSeverity: undefined })).to.be.a.journal.createSuccess;
        });
        it("allows a sideEffect", function () {
            return expect(createPatientEntry({ sideEffect: "Happy!" })).to.be.a.journal.createSuccess;
        });
        //sideEffectSeverity
        //no sideEffect
        describe("When sideEffect is not defined", function() {
            it("doesn't require a sideEffectSeverity", function () {
                return expect(createPatientEntry({ sideEffect: undefined, sideEffectSeverity: undefined })).to.be.a.journal.createSuccess;
            });
            it("allows a null sideEffectSeverity", function () {
                return expect(createPatientEntry({ sideEffect: undefined, sideEffectSeverity: null })).to.be.a.journal.createSuccess;
            });
            it("rejects a sideEffectSeverity", function () {
                return expect(createPatientEntry({ sideEffect: undefined, sideEffectSeverity: 5 })).to.be.an.api.error(400, "invalid_sideeffect");
            });
        });
        //yes sideEffect
        describe("When sideEffect is defined", function() {
            it("requires a sideEffectSeverity", function () {
                return expect(createPatientEntry({ sideEffect: "Happy!", sideEffectSeverity: undefined })).to.be.an.api.error(400, "invalid_sideeffect");
            });
            it("rejects a null sideEffectSeverity", function () {
                return expect(createPatientEntry({ sideEffect: "Happy!", sideEffectSeverity: null })).to.be.an.api.error(400, "invalid_sideeffect");
            });
            it("allows a sideEffectSeverity", function () {
                return expect(createPatientEntry({ sideEffect: "Happy!", sideEffectSeverity: 5 })).to.be.a.journal.createSuccess;
            });
            it("rejects a sideEffectSeverity below 1", function () {
                return expect(createPatientEntry({ sideEffect: "Happy!", sideEffectSeverity: 0 })).to.be.an.api.error(400, "invalid_sideeffect");
            });
            it("rejects a sideEffectSeverity above 10", function () {
                return expect(createPatientEntry({ sideEffect: "Happy!", sideEffectSeverity: 11 })).to.be.an.api.error(400, "invalid_sideeffect");
            });
        });

        //meditation
        it("rejects a number value for meditation", function () {
            return expect(createPatientEntry({ meditation: 23 }))
                .to.be.an.api.error(400, "invalid_meditation_value");
        });
        it("rejects a string value for meditation", function () {
            return expect(createPatientEntry({ meditation: "mystring" }))
                .to.be.an.api.error(400, "invalid_meditation_value");
        });
        it("rejects a null meditation", function () {
            return expect(createPatientEntry({ meditation: null }))
                .to.be.an.api.error(400, "invalid_meditation_value");
        });
        it("rejects a non-null meditationLength when meditation is false", function () {
            return expect(createPatientEntry({ meditation: false, meditationLength: 5 }))
                .to.be.an.api.error(400, "meditation_required");
        });
        it("rejects an invalid meditationLength when meditation is false", function () {
            return expect(createPatientEntry({ meditation: false, meditationLength: "foo" }))
                .to.be.an.api.error(400, "meditation_required");
        });
        it("rejects an invalid meditationLength when meditation is true", function () {
            return expect(createPatientEntry({ meditation: true, meditationLength: "foo" }))
                .to.be.an.api.error(400, "invalid_meditation_length");
        });
        it("accepts a valid meditationLength when meditation is true", function () {
            return expect(createPatientEntry({ meditation: true, meditationLength: 30 }))
                .to.be.a.journal.createSuccess;
        });
        it("accepts a valid meditation value(true) when meditationLength is null", function () {
            return expect(createPatientEntry({ meditation: true, meditationLength: null }))
                .to.be.a.journal.createSuccess;
        });
        it("accepts a valid meditation value(false) when meditationLength is null", function () {
            return expect(createPatientEntry({ meditation: false, meditationLength: null }))
                .to.be.a.journal.createSuccess;
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
        it("does not allow medication IDs not corresponding to real medications", function () {
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
