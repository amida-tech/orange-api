"use strict";
var chakram         = require("chakram"),
    util            = require("util"),
    curry           = require("curry"),
    Q               = require("q"),
    auth            = require("../common/auth.js"),
    patients        = require("../patients/common.js"),
    medications     = require("../medications/common.js"),
    fixtures        = require("./fixtures.js"),
    common          = require("./common.js");

var expect = chakram.expect;

describe("Journal", function () {
    describe("View Entry (GET /patients/:patientid/journal/:journalid)", function () {
        // basic endpoint
        var show = function (journalId, patientId, accessToken) {
            var url = util.format("http://localhost:3000/v1/patients/%d/journal/%d", patientId, journalId);
            return chakram.get(url, auth.genAuthHeaders(accessToken));
        };

        // given a patient and user nested within the patient, create a new
        // journal entry for the patient based on the factory template, and then show the entry
        var showEntry = function (data, patient) {
            var create = Q.nbind(patient.createJournalEntry, patient);
            return fixtures.build("JournalEntry", data).then(function (entry) {
                entry.setData(data);
                return entry.getData();
            }).then(create).then(function (entry) {
                return show(entry._id, patient._id, patient.user.accessToken);
            });
        };
        // create patient and user and show them automatically
        var showPatientEntry = function (data) {
            return patients.testMyPatient({}).then(curry(showEntry)(data));
        };

        // check it requires a valid user, patient and entry
        patients.itRequiresAuthentication(curry(show)(1));
        patients.itRequiresValidPatientId(curry(show)(1));
        common.itRequiresValidEntryId(show);
        // check it requires read access to patient
        patients.itRequiresReadAuthorization(curry(showEntry)({}));
        // and all of their medications
        medications.itRequiresReadAllAuthorization(function (patient, meds) {
            return showEntry({
                medication_ids: meds.map(function (m) { return m._id; })
            }, patient);
        });

        it("lets me view entries for my patients", function () {
            return expect(showPatientEntry({})).to.be.a.journal.viewSuccess;
        });

        it("lets me view entries referencing medications", function () {
            // we validate the child medication schema
            return patients.testMyPatient({}).then(function (patient) {
                var createMedication = Q.nbind(patient.createMedication, patient);
                var createEntry = Q.nbind(patient.createJournalEntry, patient);

                var ep = createMedication({
                    name: "test med"
                }).then(function (medication) {
                    return fixtures.build("JournalEntry", {}).then(function (entry) {
                        entry.medicationIds = [medication._id];
                        return entry.getData();
                    }).then(createEntry).then(function (entry) {
                        return show(entry._id, patient._id, patient.user.accessToken);
                    });
                });

                return expect(ep).to.be.a.journal.viewSuccess;
            });
        });
    });
});
