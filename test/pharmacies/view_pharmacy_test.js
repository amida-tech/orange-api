"use strict";
var util            = require("util"),
    async           = require("async"),
    factories       = require("../common/factories.js"),
    requests        = require("../common/requests.js"),
    Crud            = require("../common/crud.js"),
    auth            = require("../common/auth.js"),
    patients        = require("../patients/common.js"),
    PatientsCrud    = require("../common/patients_crud.js");

var crud = new PatientsCrud("Pharmacy", "pharmacy", "pharmacies");
var keys = ["id", "name", "phone", "address", "hours"];

describe("view a pharmacy (GET /patients/:patientid/pharmacies/:pharmacyid)", function () {
    crud.shows(keys);
});
