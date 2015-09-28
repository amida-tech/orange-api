"use strict";
var chakram         = require("chakram"),
    util            = require("util"),
    curry           = require("curry"),
    Q               = require("q"),
    auth            = require("../common/auth.js"),
    patients        = require("../patients/common.js"),
    fixtures        = require("./fixtures.js"),
    common          = require("./common.js");

var expect = chakram.expect;

describe("Doctors", function () {
    describe("Edit Doctor (PUT /patients/:patientid/doctors/:doctorid)", function () {
        // basic endpoint
        var update = function (data, doctorId, patientId, accessToken) {
            var url = util.format("http://localhost:5000/v1/patients/%d/doctors/%d", patientId, doctorId);
            return chakram.put(url, data, auth.genAuthHeaders(accessToken));
        };

        // given a patient and user nested within the patient, create a new
        // doctor for the patient based on the factory template, and then update the doctor
        var updateDoctor = function (data, modifications, patient) {
            var create = Q.nbind(patient.createDoctor, patient);
            return fixtures.build("Doctor", data).then(create).then(function (doctor) {
                return update(modifications, doctor._id, patient._id, patient.user.accessToken);
            });
        };
        // create patient and user and update them automatically
        var updatePatientDoctor = function (data, modifications) {
            return patients.testMyPatient({}).then(curry(updateDoctor)(data, modifications));
        };

        // check it requires a valid user and patient
        patients.itRequiresAuthentication(curry(update)({}, 1));
        patients.itRequiresValidPatientId(curry(update)({}, 1));
        common.itRequiresValidDoctorId(curry(update)({}));
        patients.itRequiresWriteAuthorization(curry(updateDoctor)({}, {}));

        it("lets me update doctors for my patients", function () {
            return expect(updatePatientDoctor({}, {})).to.be.a.doctor.success;
        });

        // validations
        it("doesn't allow a blank name", function () {
            return expect(updatePatientDoctor({}, {name: ""})).to.be.an.api.error(400, "name_required");
        });
        it("allows blanks for all other fields to reset them", function () {
            return updatePatientDoctor({}, {
                phone: "",
                address: "",
                notes: "",
                title: ""
            }).then(function (response) {
                expect(response).to.be.a.doctor.success;
                expect(response.body.phone).to.equal("");
                expect(response.body.address).to.equal("");
                expect(response.body.notes).to.equal("");
                expect(response.body.title).to.equal("");
            });
        });
        it("allows nulls for all other fields to reset them", function () {
            return updatePatientDoctor({}, {
                phone: null,
                address: null,
                notes: null,
                title: null
            }).then(function (response) {
                expect(response).to.be.a.doctor.success;
                expect(response.body.phone).to.equal("");
                expect(response.body.address).to.equal("");
                expect(response.body.notes).to.equal("");
                expect(response.body.title).to.equal("");
            });
        });
    });
});
