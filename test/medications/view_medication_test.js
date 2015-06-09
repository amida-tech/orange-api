"use strict";
var util            = require("util"),
    async           = require("async"),
    factories       = require("../common/factories.js"),
    requests        = require("../common/requests.js"),
    Crud            = require("../common/crud.js"),
    auth            = require("../common/auth.js"),
    patients        = require("../patients/common.js"),
    PatientsCrud    = require("../common/patients_crud.js");

var crud = new PatientsCrud("Medication", "medication", "medications");
var keys = ["id", "name", "rx_norm", "ndc", "dose", "route", "form", "rx_number", "quantity", "type", "schedule", "doctor", "pharmacy"];

describe("view a medication (GET /patients/:patientid/medications/:medicationid)", function () {
    crud.shows(keys);
});
