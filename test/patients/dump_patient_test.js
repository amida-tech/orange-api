"use strict";
var chakram         = require("chakram"),
    util            = require("util"),
    curry           = require("curry"),
    Q               = require("q"),
    auth            = require("../common/auth.js"),
    common          = require("./common.js"),
    sharing         = require("../sharing/common.js"),
    habits          = require("../habits/common.js"),
    journal         = require("../journal/common.js"),
    doctors         = require("../doctors/common.js"),
    pharmacies      = require("../pharmacies/common.js"),
    medications     = require("../medications/common.js"),
    doses           = require("../doses/common.js");

var expect = chakram.expect;

describe("Patients", function () {
    describe("View Patient JSON Data Dump (GET /patients/:patientid.json)", function () {
        // basic endpoint
        var dump = function (patientId, accessToken) {
            var url = util.format("http://localhost:5000/v1/patients/%d.json", patientId);
            return chakram.get(url, auth.genAuthHeaders(accessToken));
        };
        var dumpPatient = function (patient) {
            return dump(patient._id, patient.user.accessToken);
        };

        // check an authenticated user is required
        common.itRequiresAuthentication(dump);
        // check it requires a valid patient ID corresponding to a patient we have read
        // access to
        common.itRequiresValidPatientId(dump);
        common.itRequiresReadAuthorization(dumpPatient);

        describe("with test data set up", function () {
            // setup test user
            var user;
            before(function () {
                return auth.createTestUser(undefined, true).then(function (u) {
                    user = u;
                });
            });

            // setup test patient owned by another user, shared with this patient in the
            // anyone group
            var patient;
            before(function () {
                // create patient
                return auth.createTestUser(undefined, true).then(curry(common.createOtherPatient)({}, user)).then(function (p) {
                    patient = p;
                    // share patient
                    return Q.nbind(patient.share, patient)(user.email, "default", "anyone");
                });
            });

            // setup test doctor
            before(function () {
                return Q.nbind(patient.createDoctor, patient)({
                    name: "test doctor"
                });
            });

            // setup test pharmacy
            before(function () {
                return Q.nbind(patient.createPharmacy, patient)({
                    name: "test pharmacy"
                });
            });

            // setup test medication we have access to
            var shownMed;
            before(function () {
                return Q.nbind(patient.createMedication, patient)({
                    name: "test medication"
                }).then(function (m) {
                    shownMed = m;
                });
            });

            // setup test medication we have no access to
            var hiddenMed;
            before(function () {
                return Q.nbind(patient.createMedication, patient)({
                    name: "test medication",
                    access_anyone: "none"
                }).then(function (m) {
                    hiddenMed = m;
                });
            });

            // create journal entry we have access to
            var shownEntry;
            before(function () {
                return Q.nbind(patient.createJournalEntry, patient)({
                    date: {utc: (new Date()).toISOString(), timezone: "America/Los_Angeles"},
                    text: "example journal entry",
                    creator: "adam@west.com",
                    medication_ids: [shownMed._id]
                }).then(function (e) {
                    shownEntry = e;
                });
            });

            // create journal entry we have no access to
            before(function () {
                return Q.nbind(patient.createJournalEntry, patient)({
                    date: {utc: (new Date()).toISOString(), timezone: "America/Los_Angeles"},
                    text: "example journal entry",
                    creator: "adam@west.com",
                    medication_ids: [hiddenMed._id]
                });
            });

            // create dose event we have access to
            var shownDose;
            before(function () {
                return Q.nbind(patient.createDose, patient)({
                    medication_id: shownMed._id,
                    date: {utc: (new Date()).toISOString(), timezone: "America/Los_Angeles"},
                    creator: "adam@west.com",
                    taken: true
                }).then(function (d) {
                    shownDose = d;
                });
            });

            // create dose event we have no access to
            before(function () {
                return Q.nbind(patient.createDose, patient)({
                    medication_id: hiddenMed._id,
                    date: {utc: (new Date()).toISOString(), timezone: "America/Los_Angeles"},
                    creator: "adam@west.com",
                    taken: true
                });
            });

            // get dump
            var response, dump;
            before(function () {
                return dumpPatient(patient).then(function (r) {
                    response = r;
                    dump = r.body;
                });
            });
            before(function (done) {
                require("fs").writeFile("/tmp/test.json", JSON.stringify(dump, null, 4), done);
            });

            it("returns a valid dump", function () {
                expect(response).to.be.a.patient.dumpSuccess;
            });

            it("contains the patient's details", function () {
                // remove success and ignore additional properties (not just patient
                // data shown here);
                var patientSchema = JSON.parse(JSON.stringify(common.schema));
                patientSchema.required.splice(patientSchema.required.indexOf("success"), 1);
                delete patientSchema.properties.success;
                patientSchema.additionalProperties = true;

                expect(dump).to.have.property("patient");
                expect({
                    body: dump.patient
                }).to.have.schema(patientSchema);
            });

            it("contains users the patient is shared with", function () {
                // success removed by genericListSuccess
                expect(response).to.be.an.api.genericListSuccess("shares", sharing.schema, false);
                // share for owner and share with current user
                expect(dump.shares.length).to.equal(2);
            });

            it("contains the patient's habits", function () {
                // remove success key
                var habitsSchema = JSON.parse(JSON.stringify(habits.schema));
                habitsSchema.required.splice(habitsSchema.required.indexOf("success"), 1);
                delete habitsSchema.properties.success;
                habitsSchema.additionalProperties = true;

                // chakram schema validation checks the schema of obj.body
                expect(dump).to.have.property("habits");
                expect({
                    body: dump.habits
                }).to.have.schema(habitsSchema);
            });

            it("contains the patient's journal entries", function () {
                // success removed by genericListSuccess
                expect(response).to.be.an.api.genericListSuccess("entries", journal.schema, false);
            });

            it("only shows journal entries we have access to medications for", function () {
                expect(dump.entries.length).to.equal(1);
                expect(dump.entries[0].id).to.equal(shownEntry._id);
            });

            it("contains the patient's doctors", function () {
                // success removed by genericListSuccess
                expect(response).to.be.an.api.genericListSuccess("doctors", doctors.schema, false);
                // one doctor created
                expect(dump.doctors.length).to.equal(1);
            });

            it("contains the patient's pharmacies", function () {
                // success removed by genericListSuccess
                expect(response).to.be.an.api.genericListSuccess("pharmacies", pharmacies.schema, false);
                // one pharmacy created
                expect(dump.pharmacies.length).to.equal(1);
            });

            it("contains the patient's medications", function () {
                // success removed by genericListSuccess
                // but additional properties (e.g., summary) are added
                var medicationsSchema = JSON.parse(JSON.stringify(medications.schema));
                medicationsSchema.additionalProperties = true;
                expect(response).to.be.an.api.genericListSuccess("medications", medicationsSchema, false);
            });

            it("only shows medications the user has access to", function () {
                expect(dump.medications.length).to.equal(1);
                expect(dump.medications[0].id).to.equal(shownMed._id);
            });

            it("contains the patient's doses", function () {
                // success removed by genericListSuccess
                expect(response).to.be.an.api.genericListSuccess("doses", doses.schema, false);
            });

            it("only shows doses the user has access to", function () {
                expect(dump.doses.length).to.equal(1);
                expect(dump.doses[0].id).to.equal(shownDose._id);
            });
        });
    });
});
