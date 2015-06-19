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
    common.beforeEach();
    describe("View Doctor (GET /patients/:patientid/doctors/:doctorid)", function () {
        // basic endpoint
        var show = function (doctorId, patientId, accessToken) {
            var url = util.format("http://localhost:3000/v1/patients/%d/doctors/%d", patientId, doctorId);
            return chakram.get(url, auth.genAuthHeaders(accessToken));
        };

        // given a patient and user nested within the patient, create a new
        // doctor for the patient based on the factory template, and then show the doctor
        var showDoctor = function (data, patient) {
            var create = Q.nbind(patient.createDoctor, patient);
            return fixtures.build("Doctor", data).then(create).then(function (doctor) {
                return show(doctor._id, patient._id, patient.user.accessToken);
            });
        };
        // create patient and user and show them automatically
        var showOtherPatientDoctor = function (access, data) {
            return patients.testOtherPatient({}, access).then(curry(showDoctor)(data));
        };
        var showMyPatientDoctor = function (data) {
            return patients.testMyPatient({}).then(curry(showDoctor)(data));
        };

        // check it requires a valid user, patient and doctor
        patients.itRequiresAuthentication(curry(show)(1));
        patients.itRequiresValidPatientId(curry(show)(1));
        common.itRequiresValidDoctorId(show);

        it("should let me view doctors for my patients", function () {
            return expect(showMyPatientDoctor({})).to.be.a.doctor.success;
        });
        it("should let me view doctors for patients shared read-only", function () {
            return expect(showOtherPatientDoctor("read", {})).to.be.a.doctor.success;
        });
        it("should let me view doctors for patients shared read-write", function () {
            return expect(showOtherPatientDoctor("write", {})).to.be.a.doctor.success;
        });
        it("should not let me view doctors for patients not shared with me", function () {
            return expect(showOtherPatientDoctor("none", {})).to.be.an.api.error(403, "unauthorized");
        });
    });
});
