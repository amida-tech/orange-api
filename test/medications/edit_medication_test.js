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
var keys = ["id", "name", "rx_norm", "ndc", "dose", "route", "form", "rx_number", "quantity", "type", "schedule", "doctor_id", "pharmacy_id"];

describe("edit a medication (PUT /patients/:patientid/medications/:medicationid)", function () {
    crud.edits(keys, {'name': factories.name()}, function (success, error) {
        describe("with blank name", function () {
            error({
                name: ""
            }, 400, 'name_required');
        });

        describe("with non-blank name", function () {
            success(factories.medication());
        });

        describe("without name", function () {
            success({
                ndc: factories.ndc()
            });
        });
    });
});
