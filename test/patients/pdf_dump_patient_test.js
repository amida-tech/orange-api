"use strict";
var chakram         = require("chakram"),
    util            = require("util"),
    querystring     = require("querystring"),
    curry           = require("curry"),
    Q               = require("q"),
    auth            = require("../common/auth.js"),
    common          = require("./common.js");

var expect = chakram.expect;

describe("Patients", function () {
    describe("View Patient PDF Data Dump (GET /patients/:patientid.pdf)", function () {
        // basic endpoint
        var dump = curry(function (params, patientId, accessToken) {
            var query = querystring.stringify(params);
            var url = util.format("http://localhost:5000/v1/patients/%d.pdf?%s", patientId, query);
            return chakram.get(url, auth.genAuthHeaders(accessToken));
        });
        var dumpPatient = curry(function (params, patient) {
            return dump(params, patient._id, patient.user.accessToken);
        });

        // check an authenticated user is required
        common.itRequiresAuthentication(dump({
            start_date: "2015-07-01",
            end_date: "2015-07-31"
        }));
        // check it requires a valid patient ID corresponding to a patient we have read
        // access to
        common.itRequiresValidPatientId(dump({
            start_date: "2015-07-01",
            end_date: "2015-07-31"
        }));
        common.itRequiresNonJsonReadAuthorization(dumpPatient({
            start_date: "2015-07-01",
            end_date: "2015-07-31"
        }));

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
                    return Q.nbind(patient.share, patient)(user.email, "default", "anyone",
                                                          user.firstName, user.lastName);
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
                    date: {utc: (new Date()).toISOString(), timezone: "America/Los_Angeles"},
                    text: "example journal entry",
                    creator: "Adam West",
                    medication_ids: [shownMed._id]
                });
            });

            // create journal entry we have no access to
            before(function () {
                return Q.nbind(patient.createJournalEntry, patient)({
                    date: {utc: (new Date()).toISOString(), timezone: "America/Los_Angeles"},
                    text: "example journal entry",
                    creator: "Adam West",
                    medication_ids: [hiddenMed._id]
                });
            });

            // create dose event we have access to
            before(function () {
                return Q.nbind(patient.createDose, patient)({
                    medication_id: shownMed._id,
                    date: {utc: (new Date()).toISOString(), timezone: "America/Los_Angeles"},
                    creator: "Adam West",
                    taken: true
                });
            });

            // create dose event we have no access to
            before(function () {
                return Q.nbind(patient.createDose, patient)({
                    medication_id: hiddenMed._id,
                    date: {utc: (new Date()).toISOString(), timezone: "America/Los_Angeles"},
                    creator: "Adam West",
                    taken: true
                });
            });

            // get PDF dump
            var response;
            before(function () {
                return dumpPatient({
                    start_date: "2015-07-01",
                    end_date: "2015-07-31"
                }, patient).then(function (r) {
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

            it("handles no start date and no end date", function () {
                return expect(dumpPatient({
                    start_date: undefined,
                    end_date: undefined
                }, patient)).to.have.status(200);
            });

            it("accepts a nonpresent start date", function () {
                return expect(dumpPatient({
                    start_date: undefined,
                    end_date: "2015-07-31"
                }, patient)).to.have.status(200);
            });
            it("accepts a null start date", function () {
                return expect(dumpPatient({
                    start_date: null,
                    end_date: "2015-07-31"
                }, patient)).to.have.status(200);
            });
            it("accepts a blank start date", function () {
                return expect(dumpPatient({
                    start_date: "",
                    end_date: "2015-07-31"
                }, patient)).to.have.status(200);
            });
            it("rejects an invalid start date", function () {
                return expect(dumpPatient({
                    start_date: "foo",
                    end_date: "2015-07-31"
                }, patient)).to.be.an.api.error(400, "invalid_start");
            });

            it("accepts a nonpresent end date", function () {
                return expect(dumpPatient({
                    end_date: undefined,
                    start_date: "2015-07-31"
                }, patient)).to.have.status(200);
            });
            it("accepts a null end date", function () {
                return expect(dumpPatient({
                    end_date: null,
                    start_date: "2015-07-31"
                }, patient)).to.have.status(200);
            });
            it("accepts a blank end date", function () {
                return expect(dumpPatient({
                    end_date: "",
                    start_date: "2015-07-31"
                }, patient)).to.have.status(200);
            });
            it("rejects an invalid end date", function () {
                return expect(dumpPatient({
                    end_date: "foo",
                    start_date: "2015-07-31"
                }, patient)).to.be.an.api.error(400, "invalid_end");
            });
            it("requires a start date before the end date", function () {
                return expect(dumpPatient({
                    start_date: "2015-07-31",
                    end_date: "2015-07-01"
                }, patient)).to.be.an.api.error(400, "invalid_end");
            });
        });
    });
});
