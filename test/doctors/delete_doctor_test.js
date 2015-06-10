"use strict";
var PatientsCrud = require("../common/patients_crud.js");

var crud = new PatientsCrud("Doctor", "doctor", "doctors");
var keys = ["id", "name", "phone", "address"];

describe("delete a doctor (DELETE /patients/:patientid/doctors/:doctorid)", function () {
    crud.deletes(keys);
});
