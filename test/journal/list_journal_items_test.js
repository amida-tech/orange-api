"use strict";
var PatientsCrud = require("../common/patients_crud.js");

var crud = new PatientsCrud("JournalEntry", "journal", "entries", "journal");
var keys = ["id", "date", "text", "medication_ids"];

describe("view a list of all journal items (GET /patients/:patientid/journal)", function () {
    crud.lists(keys);
});
