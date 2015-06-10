"use strict";
var PatientsCrud = require("../common/patients_crud.js");

var crud = new PatientsCrud("JournalEntry", "journal", "entries", "journal");
var keys = ["id", "date", "text", "medication_ids"];

describe("delete a journal entry (DELETE /patients/:patientid/journal/:journalid)", function () {
    crud.deletes(keys);
});
