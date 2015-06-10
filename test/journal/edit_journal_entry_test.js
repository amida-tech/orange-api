"use strict";
var factories       = require("../common/factories.js"),
    PatientsCrud    = require("../common/patients_crud.js");

var crud = new PatientsCrud("JournalEntry", "journal", "entries", "journal");
var keys = ["id", "date", "text", "medication_ids"];

describe("edit a journal entry (PUT /patients/:patientid/journal/:journalid)", function () {
    crud.edits(keys, {date: factories.date(), text: factories.text()}, function (success, error) {
        describe("with valid data", function () {
            success(factories.journalEntry());
        });

        describe("without text", function () {
            var entry = factories.journalEntry();
            delete entry.text;
            success(entry);
        });

        describe("with blank text", function () {
            var entry = factories.journalEntry();
            entry.text = "";
            error(entry, 400, "text_required");
        });

        describe("without date", function () {
            var entry = factories.journalEntry();
            delete entry.date;
            success(entry);
        });

        describe("with invalid date", function () {
            var entry = factories.journalEntry();
            entry.date = factories.invalidDate();
            error(entry, 400, "invalid_date");
        });
    });
});
