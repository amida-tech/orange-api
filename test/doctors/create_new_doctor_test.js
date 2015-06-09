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

describe("create new doctors (POST /patients/:patientid/doctors)", function () {
    crud.creates(keys, function (success, error) {
        describe("with full doctor data", function () { success(factories.doctor()); });

        describe("with minimum working doctor data", function () {
            success({
                name: factories.name()
            });
        });

        describe("with no name", function () {
            error({
                phone: factories.phone(),
                address: factories.address()
            }, 400, 'name_required');
        });

        describe("with blank name", function () {
            error({
                name: "",
                phone: factories.phone(),
                address: factories.address()
            }, 400, 'name_required');
        });
    });
});
