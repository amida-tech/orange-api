"use strict";
var PatientsCrud = require("../common/patients_crud.js");

var crud = new PatientsCrud("JournalEntry", "journal", "entries", "journal");
// test for populated medications rather than just medication_ids
var keys = ["id", "date", "text", "medications"];

describe("view a journal entry (GET /patients/:patientid/journal/:journalid)", function () {
    crud.shows(keys);
});
