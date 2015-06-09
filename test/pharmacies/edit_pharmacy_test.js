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

describe("edit a pharmacy (PUT /patients/:patientid/pharmacies/:pharmacyid)", function () {
    crud.edits(keys, {'name': factories.name()}, function (success, error) {
        describe("with blank name", function () {
            error({
                name: ""
            }, 400, 'name_required');
        });

        describe("with non-blank name", function () {
            success({
                name: factories.name(),
                phone: factories.phone(),
                address: factories.address(),
                hours: factories.hours()
            });
        });

        describe("without name", function () {
            success({
                phone: factories.phone(),
                address: factories.address(),
                hours: factories.hours()
            });
        });
    });
});
