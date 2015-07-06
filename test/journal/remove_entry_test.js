"use strict";
var chakram         = require("chakram"),
    util            = require("util"),
    curry           = require("curry"),
    Q               = require("q"),
    auth            = require("../common/auth.js"),
    patients        = require("../patients/common.js"),
    common          = require("./common.js"),
    fixtures        = require("./fixtures.js");

var expect = chakram.expect;

describe("Journal", function () {
    describe("Remove Entry (DELETE /patients/:patientid/entries/:journalid)", function () {
        // basic endpoint
        var remove = function (journalId, patientId, accessToken) {
            var url = util.format("http://localhost:3000/v1/patients/%d/journal/%d", patientId, journalId);
            return chakram.delete(url, {}, auth.genAuthHeaders(accessToken));
        };

        // given a patient and user nested within the patient, create a new
        // entry for the patient based on the factory template, and then remove the entry
        var removeEntry = function (data, patient) {
            var create = Q.nbind(patient.createJournalEntry, patient);
            return fixtures.build("JournalEntry", data).then(function (entry) {
                entry.setData(data);
                return entry.getData();
            }).then(create).then(function (entry) {
                return remove(entry._id, patient._id, patient.user.accessToken);
            });
        };
        // create patient and user and remove them automatically
        var removePatientEntry = function (data) {
            return patients.testMyPatient({}).then(curry(removeEntry)(data));
        };

        // check it requires a valid user, patient and journal entry
        patients.itRequiresAuthentication(curry(remove)(1));
        patients.itRequiresValidPatientId(curry(remove)(1));
        common.itRequiresValidEntryId(remove);
        // check it requires write access to patient
        patients.itRequiresWriteAuthorization(curry(removeEntry)({}));
        it("requires write access to all medications specified in medication_ids");

        it("should let me remove entries for my patients", function () {
            return expect(removePatientEntry({})).to.be.a.journal.success;
        });
    });
});
