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
            var url = util.format("http://localhost:3000/v1/patients/%d/doctors/%d", patientId, doctorId);
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
        var updateOtherPatientDoctor = function (access, data, modifications) {
            return patients.testOtherPatient({}, access).then(curry(updateDoctor)(data, modifications));
        };
        var updateMyPatientDoctor = function (data, modifications) {
            return patients.testMyPatient({}).then(curry(updateDoctor)(data, modifications));
        };

        // check it requires a valid user and patient
        patients.itRequiresAuthentication(curry(update)({}, 1));
        patients.itRequiresValidPatientId(curry(update)({}, 1));
        common.itRequiresValidDoctorId(curry(update)({}));

        // access permissions
        it("should let me update doctors for my patients", function () {
            return expect(updateMyPatientDoctor({}, {})).to.be.a.doctor.success;
        });
        it("should not let me update doctors for patients shared read-only", function () {
            return expect(updateOtherPatientDoctor("read", {}, {})).to.be.an.api.error(403, "unauthorized");
        });
        it("should let me update doctors for patients shared read-write", function () {
            return expect(updateOtherPatientDoctor("write", {}, {})).to.be.a.doctor.success;
        });
        it("should not let me update doctors for patients not shared with me", function () {
            return expect(updateOtherPatientDoctor("none", {}, {})).to.be.an.api.error(403, "unauthorized");
        });

        // validations
        it("doesn't allow a blank name", function () {
            return expect(updateMyPatientDoctor({}, {name: ""})).to.be.an.api.error(400, "name_required");
        });
        it("allows a blank notes", function () {
            return expect(updateMyPatientDoctor({}, {notes: ""})).to.be.a.doctor.success;
        });
    });
});
