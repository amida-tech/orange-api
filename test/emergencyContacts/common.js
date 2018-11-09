"use strict";

var chakram     = require("chakram"),
    Q           = require("q"),
    patients    = require("../patients/common.js"),
    common      = require("../common/chakram.js"),
    auth        = require("../common/auth.js");
var expect = chakram.expect;

// verify successful responses
/*eslint-disable key-spacing */
var emergencyContactSchema = module.exports.schema = {
    required: ["success", "id", "firstName", "lastName", "relation"],
    properties: {
        success:        { type: "boolean" },
        id:             { type: "number" },
        firstName:      { type: "string" },
        lastName:       { type: "string" },
        relation:       { type: "string" },
        email:          { type: "string" },
        primaryPhone:   { type: "string" },
        secondaryPhone: { type: "string" }
    },
    additionalProperties: false
};
/*eslint-enable key-spacing */
common.addApiChain("emergencyContact", {
    "createSuccess": function (respObj) {
        expect(respObj).to.be.an.api.postSuccess;
        expect(respObj).to.have.schema(emergencyContactSchema);
    },
    "success": function (respObj) {
        expect(respObj).to.be.an.api.getSuccess;
        expect(respObj).to.have.schema(emergencyContactSchema);
    },
    "listSuccess": function (respObj) {
        expect(respObj).to.be.an.api.genericListSuccess("emergencyContacts", emergencyContactSchema);
    }
});

// endpoint takes (emergencyContactId, patientId, accessToken)
module.exports.itRequiresValidEmergencyContactId = function (endpoint) {
    describe("testing invalid emergency contacts IDs", function () {
        var user, patient, otherPatient;
        before(function () {
            // setup current user and two patients for them, one with a emergency contact
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
                    // setup emergency contact for otherPatient
                    return Q.nbind(otherPatient.createEmergencyContact, otherPatient)({ firstName: "foobar", lastName: "foo", relation: "friend" });
                });
            });
        });

        it("rejects invalid emergency contact IDs", function () {
            return expect(endpoint("foo", patient._id, user.accessToken)).to.be.an.api.error(404, "invalid_emergency_contact_id");
        });
        it("rejects emergency contact IDs not corresponding to real emergency contacts", function () {
            return expect(endpoint(9999, patient._id, user.accessToken)).to.be.an.api.error(404, "invalid_emergency_contact_id");
        });
        it("rejects emergency contact IDs not corresponding to emergency contacts belonging to other patients", function () {
            var request = endpoint(otherPatient.emergencyContacts[0]._id, patient._id, user.accessToken);
            return expect(request).to.be.an.api.error(404, "invalid_emergency_contact_id");
        });
    });
};
