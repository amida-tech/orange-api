"use strict";
var PatientsCrud = require("../common/patients_crud.js");

var crud = new PatientsCrud("Doctor", "doctor", "doctors");
var keys = ["id", "name", "phone", "address"];

describe("view a doctor (GET /patients/:patientid/doctors/:doctorid)", function () {
    crud.shows(keys);
});
