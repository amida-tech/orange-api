"use strict";
var util            = require("util"),
    async           = require("async"),
    mongoose        = require("mongoose"),
    factories       = require("../common/factories.js"),
    requests        = require("../common/requests.js"),
    Crud            = require("../common/crud.js"),
    auth            = require("../common/auth.js"),
    patients        = require("../patients/common.js"),
    PatientsCrud    = require("../common/patients_crud.js");

var crud = new PatientsCrud("Medication", "medication", "medications");
var keys = ["id", "name", "rx_norm", "ndc", "dose", "route", "form", "rx_number", "quantity", "type", "schedule", "doctor_id", "pharmacy_id"];

describe("create new medications (POST /patients/:patientid/medications)", function () {
    crud.creates(keys, function (success, error) {
        describe("with full medication data", function () {
            // TODO: test with doctor and pharmacy ID (manual test?)
            // NEEDS TO VERIFY DOCTOR/PHARMACY BELONG TO PATIENT
            success(factories.medication());
        });

        describe("with minimum working medication data", function () {
            success({
                name: factories.medication().name
            });
        });

        describe("with no name", function () {
            error({
                ndc: factories.ndc()
            }, 400, 'name_required');
        });
    });
});
