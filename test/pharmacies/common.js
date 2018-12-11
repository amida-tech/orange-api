"use strict";

var chakram     = require("chakram"),
    Q           = require("q"),
    patients    = require("../patients/common.js"),
    common      = require("../common/chakram.js"),
    auth        = require("../common/auth.js");
var expect = chakram.expect;

// verify successful responses
/*eslint-disable key-spacing */
var pharmacySchema = module.exports.schema = {
    required: ["id", "name", "phone", "address", "hours", "notes",
                // TODO: Get google api key and use for geolocation
                // "lat", "lon",
                "success"],
    properties: {
        success:    { type: "boolean" },
        id:         { type: "number" },
        name:       { type: "string" },
        phone:      { type: "string" },
        address:    { type: "string" },
        hours:      {
            required:       ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"],
            properties:     {
                // each of these required, but can be an empty object
                monday:         { "$ref": "#/definitions/hours" },
                tuesday:        { "$ref": "#/definitions/hours" },
                wednesday:      { "$ref": "#/definitions/hours" },
                thursday:       { "$ref": "#/definitions/hours" },
                friday:         { "$ref": "#/definitions/hours" },
                saturday:       { "$ref": "#/definitions/hours" },
                sunday:         { "$ref": "#/definitions/hours" }
            }
        },
        notes:      { type: "string" }
        // TODO: Get google api key and use for geolocation
        // lat:        { type: ["null", "number"] },
        // lon:        { type: ["null", "number"] }
    },
    definitions: {
        hours: {
            type: ["object"],
            properties: {
                open:   { type: "string", pattern: "^\\d\\d:\\d\\d [APap][mM]$" },
                close:  { type: "string", pattern: "^\\d\\d:\\d\\d [APap][mM]$" }
            },
            required: []
        }
    },
    additionalProperties: false
};
/*eslint-enable key-spacing */
common.addApiChain("pharmacy", {
    "createSuccess": function (respObj) {
        expect(respObj).to.be.an.api.postSuccess;
        expect(respObj).to.have.schema(pharmacySchema);
    },
    "success": function (respObj) {
        expect(respObj).to.be.an.api.getSuccess;
        expect(respObj).to.have.schema(pharmacySchema);
    },
    "listSuccess": function (respObj) {
        expect(respObj).to.be.an.api.genericListSuccess("pharmacies", pharmacySchema);
    }
});

// endpoint takes (pharmacyId, patientId, accessToken)
module.exports.itRequiresValidPharmacyId = function (endpoint) {
    describe("testing invalid pharmacy IDs", function () {
        var user, patient, otherPatient;
        before(function () {
            // setup current user and two patients for them, one with a pharmacy
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
                    return Q.nbind(otherPatient.createPharmacy, otherPatient)({ name: "foobar" });
                });
            });
        });

        it("rejects invalid pharmacy IDs", function () {
            return expect(endpoint("f", patient._id, user.accessToken)).to.be.an.api.error(404, "invalid_pharmacy_id");
        });
        it("rejects pharmacy IDs not corresponding to real pharmacies", function () {
            return expect(endpoint(9999, patient._id, user.accessToken)).to.be.an.api.error(404, "invalid_pharmacy_id");
        });
        it("rejects pharmacy IDs not corresponding to pharmacies belonging to other patients", function () {
            var request = endpoint(otherPatient.pharmacies[0]._id, patient._id, user.accessToken);
            return expect(request).to.be.an.api.error(404, "invalid_pharmacy_id");
        });
    });
};
