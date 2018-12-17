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
    describe("Edit Emergency Contact (PUT /patients/:patientid/emergencyContacts/:emergencyContactId)", function () {
        // basic endpoint
        var update = function (data, emergencyContactId, patientId, accessToken) {
            var url = util.format("http://localhost:5000/v1/patients/%d/emergencyContacts/%d", patientId, emergencyContactId);
            return chakram.put(url, data, auth.genAuthHeaders(accessToken));
        };

        // given a patient and user nested within the patient, create a new
        // emergency contact for the patient based on the factory template, and then update the emergency contact
        var updateEmergencyContact = function (data, modifications, patient) {
            var create = Q.nbind(patient.createEmergencyContact, patient);
            return fixtures.build("EmergencyContact", data).then(create).then(function (emergencyContact) {
                return update(modifications, emergencyContact._id, patient._id, patient.user.accessToken);
            });
        };
        // create patient and user and update them automatically
        var updatePatientEmergencyContact = function (data, modifications) {
            return patients.testMyPatient({}).then(curry(updateEmergencyContact)(data, modifications));
        };

        // check it requires a valid user and patient
        patients.itRequiresAuthentication(curry(update)({}, 1));
        patients.itRequiresValidPatientId(curry(update)({}, 1));
        common.itRequiresValidEmergencyContactId(curry(update)({}));
        patients.itRequiresWriteAuthorization(curry(updateEmergencyContact)({}, {}));

        it("lets me update emergency contacts for my patients", function () {
            return expect(updatePatientEmergencyContact({}, {})).to.be.a.emergencyContact.success;
        });

        // validations
        it("doesn't allow a blank firstName", function () {
            return expect(updatePatientEmergencyContact({}, {firstName: ""})).to.be.an.api.error(400, "first_name_required");
        });
        it("doesn't allow a blank lastName", function () {
            return expect(updatePatientEmergencyContact({}, {lastName: ""})).to.be.an.api.error(400, "last_name_required");
        });
        it("doesn't allow a blank relation", function () {
            return expect(updatePatientEmergencyContact({}, {relation: ""})).to.be.an.api.error(400, "relation_required");
        });

        it("allows blanks for all other fields to reset them", function () {
            return updatePatientEmergencyContact({}, {
                primaryPhone: "",
                secondaryPhone: "",
                email: ""
            }).then(function (response) {
                expect(response).to.be.a.emergencyContact.success;
                expect(response.body.primaryPhone).to.equal("");
                expect(response.body.secondaryPhone).to.equal("");
                expect(response.body.email).to.equal("");
            });
        });
        it("allows nulls for all other fields to reset them", function () {
            return updatePatientEmergencyContact({}, {
                primaryPhone: "",
                secondaryPhone: "",
                email: ""
            }).then(function (response) {
                expect(response).to.be.a.emergencyContact.success;
                expect(response.body.primaryPhone).to.equal("");
                expect(response.body.secondaryPhone).to.equal("");
                expect(response.body.email).to.equal("");
            });
        });
    });
});
