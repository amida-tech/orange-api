"use strict";

var chakram     = require("chakram"),
    Q           = require("q"),
    common      = require("../common/chakram.js"),
    patients    = require("../patients/common.js"),
    auth        = require("../common/auth.js");
var expect = chakram.expect;

// verify successful responses
/*eslint-disable key-spacing */
var shareSchema = module.exports.schema = {
    required: ["id", "email", "access", "group", "is_user", "success"],
    properties: {
        success:    { type: "boolean" },
        id:         { type: "number" },
        email:      { type: "string" },
        access:     { type: "string" },
        group:      { type: "string" },
        is_user:    { type: "boolean" },
        first_name: { type: "string" },
        last_name:  { type: "string" },
        avatar:     { type: ["null", "string"] }
    },
    additionalProperties: false
};
common.addApiChain("share", {
    "createSuccess": function (respObj) {
        expect(respObj).to.be.an.api.postSuccess;
        expect(respObj).to.have.schema(shareSchema);
    },
    "success": function (respObj) {
        expect(respObj).to.be.an.api.getSuccess;
        expect(respObj).to.have.schema(shareSchema);
    },
    "listSuccess": function (respObj) {
        expect(respObj).to.be.an.api.genericListSuccess("shares", shareSchema);
    }
});

// endpoint takes (shareId, patientId, accessToken)
module.exports.itRequiresValidShareId = function (ep) {
    describe("testing invalid share IDs", function () {
        var user, patient, otherPatient, share;
        before(function () {
            // setup current user and two patients for them, one with a share
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
                    // setup pharmacy for otherPatient
                    return Q.nbind(otherPatient.createShare, otherPatient)("foo@bar.com", "default", "prime");
                }).then(function (s) {
                    share = s;
                });
            });
        });

        it("rejects invalid share IDs", function () {
            return expect(ep("f", patient._id, user.accessToken)).to.be.an.api.error(404, "invalid_share_id");
        });
        it("rejects share IDs not corresponding to real shares", function () {
            return expect(ep(9999, patient._id, user.accessToken)).to.be.an.api.error(404, "invalid_share_id");
        });
        it("rejects share IDs corresponding to shares belonging to other patients", function () {
            return expect(ep(share._id, patient._id, user.accessToken)).to.be.an.api.error(404, "invalid_share_id");
        });
    });
};
