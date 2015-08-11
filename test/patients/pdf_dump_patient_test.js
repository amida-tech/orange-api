"use strict";
var chakram         = require("chakram"),
    util            = require("util"),
    curry           = require("curry"),
    Q               = require("q"),
    auth            = require("../common/auth.js"),
    common          = require("./common.js");

var expect = chakram.expect;

describe("Patients", function () {
    describe("View Patient PDF Data Dump (GET /patients/:patientid.pdf)", function () {
        // basic endpoint
        var dump = function (patientId, accessToken) {
            var url = util.format("http://localhost:3000/v1/patients/%d.pdf", patientId);
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
        common.itRequiresNonJsonReadAuthorization(dumpPatient);

        describe("with test data set up", function () {
            // setup test user
            var user;
            before(function () {
                return auth.createTestUser().then(function (u) {
                    user = u;
                });
            });

            // setup test patient owned by another user, shared with this patient in the
            // anyone group
            var patient;
            before(function () {
                // create patient
                return auth.createTestUser().then(curry(common.createOtherPatient)({}, user)).then(function (p) {
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
            before(function () {
                return Q.nbind(patient.createJournalEntry, patient)({
                    date: (new Date()).toISOString(),
                    text: "example journal entry",
                    medication_ids: [shownMed._id]
                });
            });

            // create journal entry we have no access to
            before(function () {
                return Q.nbind(patient.createJournalEntry, patient)({
                    date: (new Date()).toISOString(),
                    text: "example journal entry",
                    medication_ids: [hiddenMed._id]
                });
            });

            // create dose event we have access to
            before(function () {
                return Q.nbind(patient.createDose, patient)({
                    medication_id: shownMed._id,
                    date: (new Date()).toISOString(),
                    taken: true
                });
            });

            // create dose event we have no access to
            before(function () {
                return Q.nbind(patient.createDose, patient)({
                    medication_id: hiddenMed._id,
                    date: (new Date()).toISOString(),
                    taken: true
                });
            });

            // get PDF dump
            var response;
            before(function () {
                return dumpPatient(patient).then(function (r) {
                    response = r;
                });
            });

            // we don't actually verify the contents of the PDF here, we just
            // check MIME type etc
            it("returns the correct MIME type", function () {
                expect(response.response.headers).to.include.key("content-type");
                expect(response.response.headers["content-type"]).to.equal("application/pdf");
            });


            it("returns some data", function () {
                // check response body size to make sure it's big enough to feasibly be a PDF
                expect(response.body.length).to.be.at.least(1024);
            });
        });
    });
});
