"use strict";
var chakram         = require("chakram"),
    util            = require("util"),
    curry           = require("curry"),
    auth            = require("../common/auth.js"),
    patients        = require("../patients/common.js"),
    fixtures        = require("./fixtures.js");

var expect = chakram.expect;

describe("Emergency Contacts", function () {
    describe("Create New Emergency Contact (POST /patients/:patientid/emergencyContacts)", function () {
        // basic endpoint
        var create = function (data, patientId, accessToken) {
            var url = util.format("http://localhost:5000/v1/patients/%d/emergencyContacts", patientId);
            return chakram.post(url, data, auth.genAuthHeaders(accessToken));
        };

        // given a patient and user nested within the patient, try and create a new
        // emergency contact for the patient based on the factory template
        var createEmergencyContact = function (data, patient) {
            return fixtures.build("EmergencyContact", data).then(function (emergencyContact) {
                return create(emergencyContact, patient._id, patient.user.accessToken);
            });
        };
        // create patient and user automatically
        var createPatientEmergencyContact = function (data) {
            return patients.testMyPatient({}).then(curry(createEmergencyContact)(data));
        };

        // check it requires a valid user and patient
        patients.itRequiresAuthentication(curry(create)({}));
        patients.itRequiresValidPatientId(curry(create)({}));
        patients.itRequiresWriteAuthorization(curry(createEmergencyContact)({}));

        it("creates patients", function () {
            return expect(createPatientEmergencyContact({})).to.be.a.emergencyContact.createSuccess;
        });

        // validation testing
        it("requires a firstName", function () {
            return expect(createPatientEmergencyContact({ firstName: undefined })).to.be.an.api.error(400, "first_name_required");
        });
        it("does not allow a blank firstName", function () {
            return expect(createPatientEmergencyContact({ firstName: "" })).to.be.an.api.error(400, "first_name_required");
        });
        it("does not allow a null firstName", function () {
            return expect(createPatientEmergencyContact({ firstName: null })).to.be.an.api.error(400, "first_name_required");
        });

        it("requires a lastName", function () {
            return expect(createPatientEmergencyContact({ lastName: undefined })).to.be.an.api.error(400, "last_name_required");
        });
        it("does not allow a blank lastName", function () {
            return expect(createPatientEmergencyContact({ lastName: "" })).to.be.an.api.error(400, "last_name_required");
        });
        it("does not allow a null lastName", function () {
            return expect(createPatientEmergencyContact({ lastName: null })).to.be.an.api.error(400, "last_name_required");
        });



        // it("does not require anything other than a name", function () {
        //     return expect(createPatientEmergencyContact({
        //         phone: undefined,
        //         address: undefined,
        //         notes: undefined,
        //         title: undefined
        //     })).to.be.a.emergencyContact.createSuccess;
        // });
        // it("allows nulls for everything other than name", function () {
        //     return expect(createPatientEmergencyContact({
        //         phone: null,
        //         address: null,
        //         notes: null,
        //         title: null
        //     })).to.be.a.emergencyContact.createSuccess;
        // });
        // it("allows blank strings for all fields other than name", function () {
        //     return expect(createPatientEmergencyContact({
        //         phone: "",
        //         address: "",
        //         notes: "",
        //         title: ""
        //     })).to.be.a.emergencyContact.createSuccess;
        // });
    });
});
