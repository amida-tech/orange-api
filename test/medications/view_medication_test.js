"use strict";
var chakram     = require("chakram"),
    curry       = require("curry"),
    Q           = require("q"),
    util        = require("util"),
    auth        = require("../common/auth.js"),
    common      = require("./common.js"),
    patients    = require("../patients/common.js");

var expect = chakram.expect;

describe("Medications", function () {
    describe("Show Single Medication (GET /patients/:patientid/medications/:medicationid)", function () {
        // given a patient ID, medication ID and acces token, try and show the medication
        var show = function (medicationId, patientId, accessToken) {
            var url = util.format("http://localhost:3000/v1/patients/%d/medications/%d", patientId, medicationId);
            return chakram.get(url, auth.genAuthHeaders(accessToken));
        };
        var showMedication = function (patient, medication) {
            return show(medication._id, patient._id, patient.user.accessToken);
        };

        patients.itRequiresAuthentication(curry(show)(1));
        patients.itRequiresValidPatientId(curry(show)(1));
        common.itRequiresReadAuthorization(showMedication);
    });
});
