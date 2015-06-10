"use strict";
var PatientsCrud = require("../common/patients_crud.js");

var crud = new PatientsCrud("Doctor", "doctor", "doctors");
var keys = ["id", "name", "phone", "address"];

describe("view a list of doctors (GET /patients/:patientid/doctors)", function () {
    crud.lists(keys);
});
