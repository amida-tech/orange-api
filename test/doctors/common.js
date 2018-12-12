"use strict";

var chakram     = require("chakram"),
    Q           = require("q"),
    patients    = require("../patients/common.js"),
    common      = require("../common/chakram.js"),
    auth        = require("../common/auth.js");
var expect = chakram.expect;

// verify successful responses
/*eslint-disable key-spacing */
var doctorSchema = module.exports.schema = {
    required: ["success", "id", "name", "phone", "address", "notes", "title"],
    properties: {
        success:    { type: "boolean" },
        id:         { type: "number" },
        name:       { type: "string" },
        phone:      { type: "string" },
        address:    { type: "string" },
        notes:      { type: "string" },
        title:      { type: "string" }
    },
    additionalProperties: false
};
/*eslint-enable key-spacing */
common.addApiChain("doctor", {
    "createSuccess": function (respObj) {
        expect(respObj).to.be.an.api.postSuccess;
        expect(respObj).to.have.schema(doctorSchema);
    },
    "success": function (respObj) {
        expect(respObj).to.be.an.api.getSuccess;
        expect(respObj).to.have.schema(doctorSchema);
    },
    "listSuccess": function (respObj) {
        expect(respObj).to.be.an.api.genericListSuccess("doctors", doctorSchema);
    }
});

// endpoint takes (doctorId, patientId, accessToken)
module.exports.itRequiresValidDoctorId = function (endpoint) {
    describe("testing invalid doctor IDs", function () {
        var user, patient, otherPatient;
        before(function () {
            // setup current user and two patients for them, one with a doctor
            return auth.createTestUser(undefined, true).then(function (u) {
                user = u;
                // create patients
                return Q.all([
                    patients.createMyPatient({}, user),
                    patients.createMyPatient({}, user)
                ]).spread(function (p1, p2) {
                    patient = p1;
                    otherPatient = p2;
                }).then(function () {
                    // setup doctor for otherPatient
                    return Q.nbind(otherPatient.createDoctor, otherPatient)({ name: "foobar" });
                });
            });
        });

        it("rejects invalid doctor IDs", function () {
            return expect(endpoint("foo", patient._id, user.accessToken)).to.be.an.api.error(404, "invalid_doctor_id");
        });
        it("rejects doctor IDs not corresponding to real doctors", function () {
            return expect(endpoint(9999, patient._id, user.accessToken)).to.be.an.api.error(404, "invalid_doctor_id");
        });
        it("rejects doctor IDs not corresponding to doctors belonging to other patients", function () {
            var request = endpoint(otherPatient.doctors[0]._id, patient._id, user.accessToken);
            return expect(request).to.be.an.api.error(404, "invalid_doctor_id");
        });
    });
};
