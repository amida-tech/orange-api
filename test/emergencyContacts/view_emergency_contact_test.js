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

describe("Emergency Contacts", function () {
    describe("View Emergency Contact (GET /patients/:patientid/emergencyContacts/:emergencyContactId)", function () {
        // basic endpoint
        var show = function (emergencyContactId, patientId, accessToken) {
            var url = util.format("http://localhost:5000/v1/patients/%d/emergencyContacts/%d", patientId, emergencyContactId);
            return chakram.get(url, auth.genAuthHeaders(accessToken));
        };

        // given a patient and user nested within the patient, create a new
        // emergency contact for the patient based on the factory template, and then show the emergency contact
        var showEmergencyContact = function (data, patient) {
            var create = Q.nbind(patient.createEmergencyContact, patient);
            return fixtures.build("EmergencyContact", data).then(create).then(function (emergencyContact) {
                return show(emergencyContact._id, patient._id, patient.user.accessToken);
            });
        };
        // create patient and user and show them automatically
        var showPatientEmergencyContact = function (data) {
            return patients.testMyPatient({}).then(curry(showEmergencyContact)(data));
        };

        // check it requires a valid user, patient and emergency contact
        patients.itRequiresAuthentication(curry(show)(1));
        patients.itRequiresValidPatientId(curry(show)(1));
        common.itRequiresValidEmergencyContactId(show);
        patients.itRequiresReadAuthorization(curry(showEmergencyContact)({}));

        it("lets me view emergency contacts for my patients", function () {
            return expect(showPatientEmergencyContact({})).to.be.a.emergencyContact.success;
        });
    });
});
