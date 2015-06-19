"use strict";

var chakram     = require("chakram"),
    Q           = require("q"),
    patients    = require("../patients/common.js"),
    auth        = require("../common/auth.js");
var expect = chakram.expect;

// *must* do this on beforeEach: we may be overriding it on before
module.exports.beforeEach = function () {
    beforeEach(function () {
        // namespacing
        chakram.addProperty("journal", function () {} );

        // verify successful responses
        /*eslint-disable key-spacing */
        var entrySchema = {
            required: ["id", "date", "text"],
            properties: {
                id:             { type: "number" },
                date:           { type: "string" },
                text:           { type: "string" },
                medication_ids: {
                    type:       "array",
                    items:  {
                        type:   "number"
                    }
                }
            }
        };
        var entryViewSchema = JSON.parse(JSON.stringify(entrySchema)); // easy deep copy
        entryViewSchema.required.push("medications");
        entrySchema.required.push("medication_ids");
        /*eslint-enable key-spacing */
        chakram.addProperty("success", function (respObj) {
            expect(respObj).to.be.an.api.getSuccess;
            expect(respObj).to.have.schema(entrySchema);
        });
        chakram.addProperty("viewSuccess", function (respObj) {
            expect(respObj).to.be.an.api.getSuccess;
            expect(respObj).to.have.schema(entryViewSchema);
        });
        chakram.addProperty("createSuccess", function (respObj) {
            expect(respObj).to.be.an.api.postSuccess;
            expect(respObj).to.have.schema(entrySchema);
        });
    });
};

// endpoint takes (entryId, patientId, accessToken)
module.exports.itRequiresValidEntryId = function (endpoint) {
    describe("testing invalid journal entry IDs", function () {
        var user, patient, otherPatient;
        before(function () {
            // setup current user and two patients for them, one with a journal entry
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
                    // setup journal entry for otherPatient
                    return Q.nbind(otherPatient.createJournalEntry, otherPatient)({ text: "foobar", date: (new Date()).toISOString() });
                });
            });
        });

        it("should not accept invalid journal IDs", function () {
            return expect(endpoint("foo", patient._id, user.accessToken)).to.be.an.api.error(404, "invalid_journal_id");
        });
        it("should not accept journal IDs not corresponding to real entries", function () {
            return expect(endpoint(9999, patient._id, user.accessToken)).to.be.an.api.error(404, "invalid_journal_id");
        });
        it("should not accept journal IDs corresponding to entries belonging to other patients", function () {
            var request = endpoint(otherPatient.entries[0]._id, patient._id, user.accessToken);
            return expect(request).to.be.an.api.error(404, "invalid_journal_id");
        });
    });
};
