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
    describe("Remove Emergency Contact (DELETE /patients/:patientid/emergencyContacts/:emergencyContactId)", function () {
        // basic endpoint
        var remove = function (emergencyContactId, patientId, accessToken) {
            var url = util.format("http://localhost:5000/v1/patients/%d/emergencyContacts/%d", patientId, emergencyContactId);
            return chakram.delete(url, {}, auth.genAuthHeaders(accessToken));
        };

        // given a patient and user nested within the patient, create a new
        // emergency contact for the patient based on the factory template, and then remove the emergency contact
        var removeEmergencyContact = function (data, patient) {
            var create = Q.nbind(patient.createEmergencyContact, patient);
            return fixtures.build("EmergencyContact", data).then(create).then(function (emergencyContact) {
                return remove(emergencyContact._id, patient._id, patient.user.accessToken);
            });
        };
        // create patient and user and remove them automatically
        var removePatientEmergencyContact = function (data) {
            return patients.testMyPatient({}).then(curry(removeEmergencyContact)(data));
        };

        // check it requires a valid user, patient and emergency contact
        patients.itRequiresAuthentication(curry(remove)(1));
        patients.itRequiresValidPatientId(curry(remove)(1));
        common.itRequiresValidEmergencyContactId(remove);
        patients.itRequiresWriteAuthorization(curry(removeEmergencyContact)({}));

        it("lets me remove emergency contacts for my patients", function () {
            return expect(removePatientEmergencyContact({})).to.be.a.emergencyContact.success;
        });
    });
});
