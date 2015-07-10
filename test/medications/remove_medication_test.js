"use strict";
var chakram     = require("chakram"),
    curry       = require("curry"),
    util        = require("util"),
    auth        = require("../common/auth.js"),
    common      = require("./common.js"),
    patients    = require("../patients/common.js");

describe("Medications", function () {
    describe("Remove A Medication (DELETE /patients/:patientid/medications/:medicationid)", function () {
        // given a patient ID, medication ID and acces token, try and delete the medication
        var remove = function (medicationId, patientId, accessToken) {
            var url = util.format("http://localhost:3000/v1/patients/%d/medications/%d", patientId, medicationId);
            return chakram.delete(url, {}, auth.genAuthHeaders(accessToken));
        };
        var removeMedication = function (patient, medication) {
            return remove(medication._id, patient._id, patient.user.accessToken);
        };

        patients.itRequiresAuthentication(curry(remove)(1));
        patients.itRequiresValidPatientId(curry(remove)(1));
        common.itRequiresWriteAuthorization(removeMedication);
    });
});
