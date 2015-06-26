"use strict";

var chakram     = require("chakram"),
    Q           = require("q"),
    common      = require("../common/chakram.js"),
    patients    = require("../patients/common.js"),
    auth        = require("../common/auth.js");
var expect = chakram.expect;

// verify successful responses
/*eslint-disable key-spacing */
var doseSchema = {
    required: ["id", "date", "notes"],
    properties: {
        id:             { type: "number" },
        medication_id:  { type: "number" },
        medication:     { type: "object" },
        date:           { type: "string" },
        notes:          { type: "string" }
    }
};
var doseViewSchema = JSON.parse(JSON.stringify(doseSchema)); // easy deep copy
doseViewSchema.required.push("medication");
doseSchema.required.push("medication_id");
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
                }).then(function (d) {
                    console.log(d);
                    console.log(otherPatient);
                    // setup dose for otherPatient
                    return Q.nbind(otherPatient.createDose, otherPatient)({
                        medication_id: otherPatient.medications[0]._id,
                        date: (new Date()).toISOString(),
                        notes: "foobar"
                    });
                });
            });
        });

        it("should not accept invalid dose IDs", function () {
            return expect(endpoint("foo", patient._id, user.accessToken)).to.be.an.api.error(404, "invalid_dose_id");
        });
        it("should not accept dose IDs not corresponding to real dose events", function () {
            return expect(endpoint(9999, patient._id, user.accessToken)).to.be.an.api.error(404, "invalid_dose_id");
        });
        it("should not accept dose IDs corresponding to dose events belonging to other patients", function () {
            var request = endpoint(otherPatient.doses[0]._id, patient._id, user.accessToken);
            return expect(request).to.be.an.api.error(404, "invalid_dose_id");
        });
    });
};
