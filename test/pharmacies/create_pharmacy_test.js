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

describe("create new pharmacies (POST /patients/:patientid/pharmacies)", function () {
    crud.creates(keys, function (success, error) {
        describe("with full pharmacy data", function () { success(factories.pharmacy()); });

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

        describe("with partial hours", function () {
            var pharmacy = factories.pharmacy();
            pharmacy.hours = factories.partialHours();
            success(pharmacy);
        });

        describe("with invalid hours", function () {
            var pharmacy = factories.pharmacy();
            pharmacy.hours = factories.invalidHours();
            error(pharmacy, 400, "invalid_hours");
        });
    });
});
