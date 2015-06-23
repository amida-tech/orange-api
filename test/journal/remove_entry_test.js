"use strict";
var chakram         = require("chakram"),
    util            = require("util"),
    curry           = require("curry"),
    Q               = require("q"),
    auth            = require("../common/auth.js"),
    patients        = require("../patients/common.js"),
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
        var removeOtherPatientEntry = function (access, data) {
            return patients.testOtherPatient({}, access).then(curry(removeEntry)(data));
        };
        var removeMyPatientEntry = function (data) {
            return patients.testMyPatient({}).then(curry(removeEntry)(data));
        };

        // check it requires a valid user, patient and journal entry
        patients.itRequiresAuthentication(curry(remove)(1));
        patients.itRequiresValidPatientId(curry(remove)(1));
        it("uncomment");
        //common.itRequiresValidEntryId(remove);

        it("should let me remove entries for my patients", function () {
            return expect(removeMyPatientEntry({})).to.be.a.journal.success;
        });
        it("should not let me remove entries for patients shared read-only", function () {
            return expect(removeOtherPatientEntry("read", {})).to.be.an.api.error(403, "unauthorized");
        });
        it("should let me remove entries for patients shared read-write", function () {
            return expect(removeOtherPatientEntry("write", {})).to.be.a.journal.success;
        });
        it("should not let me remove entries for patients not shared with me", function () {
            return expect(removeOtherPatientEntry("none", {})).to.be.an.api.error(403, "unauthorized");
        });
    });
});
