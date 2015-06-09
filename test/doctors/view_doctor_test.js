"use strict";
var util            = require("util"),
    async           = require("async"),
    factories       = require("../common/factories.js"),
    requests        = require("../common/requests.js"),
    Crud            = require("../common/crud.js"),
    auth            = require("../common/auth.js"),
    patients        = require("../patients/common.js"),
    PatientsCrud    = require("../common/patients_crud.js");

var crud = new PatientsCrud("Doctor", "doctor", "doctors");
var keys = ["id", "name", "phone", "address"];

describe("view a doctor (GET /patients/:patientid/doctors/:doctorid)", function () {
    crud.shows(keys);
});
