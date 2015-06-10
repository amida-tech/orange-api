"use strict";
var factories       = require("../common/factories.js"),
    PatientsCrud    = require("../common/patients_crud.js");

var crud = new PatientsCrud("JournalEntry", "journal", "entries", "journal");
var keys = ["id", "date", "text", "medication_ids"];

describe("create new journal item (POST /patients/:patientid/journal)", function () {
    crud.creates(keys, function (success, error) {
        // TODO: test medication ID functionality
        describe("with valid data", function () {
            success(factories.journalEntry());
        });

        describe("with no date", function () {
            var entry = factories.journalEntry();
            delete entry.date;
            error(entry, 400, "date_required");
        });

        describe("with an invalid date", function () {
            var entry = factories.journalEntry();
            entry.date = factories.invalidDate();
            error(entry, 400, "invalid_date");
        });

        describe("with no text", function () {
            var entry = factories.journalEntry();
            delete entry.text;
            error(entry, 400, "text_required");
        });

        describe("with blank text", function () {
            var entry = factories.journalEntry();
            entry.text = "";
            error(entry, 400, "text_required");
        });
    });
});
