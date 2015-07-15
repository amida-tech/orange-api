"use strict";

var chakram     = require("chakram"),
    Q           = require("q"),
    common      = require("../common/chakram.js"),
    patients    = require("../patients/common.js"),
    medications = require("../medications/common.js"),
    auth        = require("../common/auth.js");
var expect = chakram.expect;

// we validate child schemata, but success shouldn't be present on a medication object here
var medicationSchema = JSON.parse(JSON.stringify(medications.schema));
medicationSchema.required.splice(medicationSchema.required.indexOf("success"));
delete medicationSchema.properties.success;

// verify successful responses
/*eslint-disable key-spacing */
var doseSchema = module.exports.schema = {
    required: ["success", "id", "date", "notes"],
    properties: {
        success:        { type: "boolean" },
        id:             { type: "number" },
        date:           { type: "string" },
        notes:          { type: "string" }
    },
    definitions: {
        medication: medicationSchema
    },
    additionalProperties: false
};
var doseViewSchema = JSON.parse(JSON.stringify(doseSchema)); // easy deep copy

// viewing a dose in detail should show full medication details
doseViewSchema.required.push("medication");
doseViewSchema.properties.medication = {
    type: "object",
    "$ref": "#/definitions/medication"
};

// other endpoints should just have a medication ID
doseSchema.required.push("medication_id");
doseSchema.properties.medication_id = {
    type:   "number"
};

common.addApiChain("dose", {
    "createSuccess": function (respObj) {
        expect(respObj).to.be.an.api.postSuccess;
        expect(respObj).to.have.schema(doseSchema);
    },
    "viewSuccess": function (respObj) {
        expect(respObj).to.be.an.api.getSuccess;
        expect(respObj).to.have.schema(doseViewSchema);
    },
    "success": function (respObj) {
        expect(respObj).to.be.an.api.getSuccess;
        expect(respObj).to.have.schema(doseSchema);
    },
    "listSuccess": function (respObj) {
        expect(respObj).to.be.an.api.genericListSuccess("doses", doseSchema);
    }
});

// endpoint takes (entryId, patientId, accessToken)
module.exports.itRequiresValidDoseId = function (endpoint) {
    describe("testing invalid dose event IDs", function () {
        var user, patient, otherPatient;
        before(function () {
            // setup current user and two patients for them, one with a dose
            return auth.createTestUser().then(function (u) {
                user = u;
                // create patients
                return Q.all([
                    patients.createMyPatient({}, user),
                    patients.createMyPatient({}, user)
                ]).spread(function (p1, p2) {
                    patient = p1;
                    otherPatient = p2;
                }).then(function () {
                    // create medication for otherPatient
                    return Q.nbind(otherPatient.createMedication, otherPatient)({ name: "foobar" });
                }).then(function () {
                    // setup dose for otherPatient
                    return Q.nbind(otherPatient.createDose, otherPatient)({
                        medication_id: otherPatient.medications[0]._id,
                        date: (new Date()).toISOString(),
                        notes: "foobar"
                    });
                });
            });
        });

        it("rejects invalid dose IDs", function () {
            return expect(endpoint("foo", patient._id, user.accessToken)).to.be.an.api.error(404, "invalid_dose_id");
        });
        it("rejects dose IDs not corresponding to real dose events", function () {
            return expect(endpoint(9999, patient._id, user.accessToken)).to.be.an.api.error(404, "invalid_dose_id");
        });
        it("rejects dose IDs corresponding to dose events belonging to other patients", function () {
            var request = endpoint(otherPatient.doses[0]._id, patient._id, user.accessToken);
            return expect(request).to.be.an.api.error(404, "invalid_dose_id");
        });
    });
};
