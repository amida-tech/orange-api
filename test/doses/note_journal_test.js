"use strict";
var chakram         = require("chakram"),
    Q               = require("q"),
    patients        = require("../patients/common.js"),
    listEntries     = require("../journal/list_entries_test.js").list;

var expect = chakram.expect;

describe("Doses", function () {
    describe("Event Notes as Journal Entries", function () {
        // setup test user and patient
        var patient;
        before(function () {
            return patients.testMyPatient({}).then(function (p) {
                patient = p;
            });
        });

        // setup test medication, with an initial schedule of twice per day
        var medication;
        before(function () {
            return Q.nbind(patient.createMedication, patient)({
                name: "test medication",
                schedule: {
                    as_needed: false,
                    regularly: true,
                    until: { type: "forever" },
                    frequency: { n: 1, unit: "day" },
                    times: [
                        { type: "exact", time: "09:00 am" },
                        { type: "exact", time: "10:00 am" }
                    ],
                    take_with_food: null,
                    take_with_medications: [],
                    take_without_medications: []
                }
            }).then(function (m) {
                medication = m;
            });
        });

        describe("initially", function () {
            // just a sanity check so we can assume that no other journal entries are present
            // in our other tests
            it("has no journal entries", function () {
                return listEntries(patient._id, patient.user.accessToken, {
                    medication_ids: [medication._id]
                }).then(function (resp) {
                    expect(resp).to.be.a.journal.listSuccess;
                    expect(resp.body.count).to.equal(0);
                });
            });
        });

        // create a dose for that medication
        var dose;
        describe("after creating a dose", function () {
            before(function () {
                return Q.nbind(patient.createDose, patient)({
                    date: (new Date()).toISOString(),
                    dose: {unit: "unit", quantity: 1},
                    notes: "TEST DOSE-SPECIFIC NOTE",
                    taken: true,
                    scheduled: 0,
                    medication_id: medication._id
                }).then(function (d) {
                    dose = d;
                });
            });

            // query the journal list endpoint
            it("shows the journal entry for the dose note", function () {
                return listEntries(patient._id, patient.user.accessToken, {
                    medication_ids: [medication._id]
                }).then(function (resp) {
                    expect(resp).to.be.a.journal.listSuccess;
                    expect(resp.body.count).to.equal(1);

                    var entry = resp.body.entries[0];
                    expect(entry.medication_ids).to.deep.equal([medication._id]);
                    expect(entry.text).to.equal("TEST DOSE-SPECIFIC NOTE");
                });
            });
        });

        // modifying the dose
        describe("after modifying the dose", function () {
            before(function () {
                return Q.nbind(patient.findDoseByIdAndUpdate, patient)(dose._id, {
                    notes: "SOME MORE NOTES"
                }).then(function (d) {
                    dose = d;
                });
            });

            it("updated the journal entry", function () {
                return listEntries(patient._id, patient.user.accessToken, {
                    medication_ids: [medication._id]
                }).then(function (resp) {
                    expect(resp).to.be.a.journal.listSuccess;
                    expect(resp.body.count).to.equal(1);

                    var entry = resp.body.entries[0];
                    expect(entry.medication_ids).to.deep.equal([medication._id]);
                    expect(entry.text).to.equal("SOME MORE NOTES");
                });
            });
        });

        // removing the journal entry by setting notes to blank
        describe("after setting the dose notes to blank", function () {
            before(function () {
                return Q.nbind(patient.findDoseByIdAndUpdate, patient)(dose._id, {
                    notes: ""
                }).then(function (d) {
                    dose = d;
                });
            });

            it("removed the journal entry", function () {
                return listEntries(patient._id, patient.user.accessToken, {
                    medication_ids: [medication._id]
                }).then(function (resp) {
                    expect(resp).to.be.a.journal.listSuccess;
                    expect(resp.body.count).to.equal(0);
                });
            });
        });

        var entryId;
        describe("after setting the dose notes back to a non-blank value", function () {
            before(function () {
                return Q.nbind(patient.findDoseByIdAndUpdate, patient)(dose._id, {
                    notes: "LOREM IPSUM"
                }).then(function (d) {
                    dose = d;
                });
            });

            it("created another new journal entry", function () {
                return listEntries(patient._id, patient.user.accessToken, {
                    medication_ids: [medication._id]
                }).then(function (resp) {
                    expect(resp).to.be.a.journal.listSuccess;
                    expect(resp.body.count).to.equal(1);

                    var entry = resp.body.entries[0];
                    expect(entry.medication_ids).to.deep.equal([medication._id]);
                    expect(entry.text).to.equal("LOREM IPSUM");
                    entryId = entry.id;
                });
            });
        });

        describe("after editing the journal entry", function () {
            before(function () {
                return Q.nbind(patient.findJournalEntryByIdAndUpdate, patient)(entryId, {
                    text: "new text"
                });
            });

            it("updated the journal entry", function () {
                return listEntries(patient._id, patient.user.accessToken, {
                    medication_ids: [medication._id]
                }).then(function (resp) {
                    expect(resp).to.be.a.journal.listSuccess;
                    expect(resp.body.count).to.equal(1);

                    var entry = resp.body.entries[0];
                    expect(entry.medication_ids).to.deep.equal([medication._id]);
                    expect(entry.text).to.equal("new text");
                });
            });

            it("updated the dose notes text", function () {
                return Q.nbind(patient.findDoseById, patient)(dose._id).then(function (d) {
                    expect(d.notes).to.equal("new text");
                });
            });
        });

        describe("after deleting the journal entry", function () {
            before(function () {
                return Q.nbind(patient.findJournalEntryByIdAndDelete, patient)(entryId);
            });

            it("deleted the journal entry", function () {
                return listEntries(patient._id, patient.user.accessToken, {
                    medication_ids: [medication._id]
                }).then(function (resp) {
                    expect(resp).to.be.a.journal.listSuccess;
                    expect(resp.body.count).to.equal(0);
                });
            });

            it("set the dose notes text to be blank", function () {
                return Q.nbind(patient.findDoseById, patient)(dose._id).then(function (d) {
                    expect(d.notes).to.equal("");
                });
            });
        });

        describe("after setting the dose notes back to a non-blank value", function () {
            before(function () {
                return Q.nbind(patient.findDoseByIdAndUpdate, patient)(dose._id, {
                    notes: "IPSUM LOREM"
                }).then(function (d) {
                    dose = d;
                });
            });

            it("created another new journal entry", function () {
                return listEntries(patient._id, patient.user.accessToken, {
                    medication_ids: [medication._id]
                }).then(function (resp) {
                    expect(resp).to.be.a.journal.listSuccess;
                    expect(resp.body.count).to.equal(1);

                    var entry = resp.body.entries[0];
                    expect(entry.medication_ids).to.deep.equal([medication._id]);
                    expect(entry.text).to.equal("IPSUM LOREM");
                });
            });
        });

        describe("after removing the dose", function () {
            before(function () {
                return Q.nbind(patient.findDoseByIdAndDelete, patient)(dose._id);
            });

            it("removed the journal entry", function () {
                return listEntries(patient._id, patient.user.accessToken, {
                    medication_ids: [medication._id]
                }).then(function (resp) {
                    expect(resp).to.be.a.journal.listSuccess;
                    expect(resp.body.count).to.equal(0);
                });
            });
        });
    });
});
