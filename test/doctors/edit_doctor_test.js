"use strict";
var factories       = require("../common/factories.js"),
    PatientsCrud    = require("../common/patients_crud.js");

var crud = new PatientsCrud("Doctor", "doctor", "doctors");
var keys = ["id", "name", "phone", "address"];

describe("edit a doctor (PUT /patients/:patientid/doctors/:doctorid)", function () {
    crud.edits(keys, {name: factories.name()}, function (success, error) {
        describe("with blank name", function () {
            error({
                name: ""
            }, 400, "name_required");
        });

        describe("with non-blank name", function () {
            success({
                name: factories.name(),
                phone: factories.phone(),
                address: factories.address()
            });
        });

        describe("without name", function () {
            success({
                phone: factories.phone(),
                address: factories.address()
            });
        });
    });
});
