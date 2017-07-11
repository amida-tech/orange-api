"use strict";

var chakram     = require("chakram"),
    Q           = require("q"),
    common      = require("../common/chakram.js"),
    patients    = require("../patients/common.js"),
    auth        = require("../common/auth.js"),
    medications = require("../medications/common.js");
var expect = chakram.expect;

// we validate child medication schemata, but success shouldn't be present on a
// medication object here
var medicationSchema = JSON.parse(JSON.stringify(medications.schema));
medicationSchema.required.splice(medicationSchema.required.indexOf("success"), 1);
delete medicationSchema.properties.success;

// verify successful responses
/*eslint-disable key-spacing */
var entrySchema = module.exports.schema = {
    required: ["success", "id", "date", "meditation", "mood", "hashtags", "clinician"],
    properties: {
        success:        { type: "boolean" },
        id:             { type: "number" },
        date:           { type: "string" },
        text:           { type: "string" },
        mood:           { type: "string" },
        moodEmoji:      { type: "string" },
        meditation:     { type: "boolean" },
        meditationLength: { type: "number"},
        clinician:      { type: "boolean" },
        hashtags:       {
            type:       "array",
            items:  {
                type:   "string"
            }
        }
    },
    definitions: {
        medication: medicationSchema
    },
    additionalProperties: false
};
var entryViewSchema = JSON.parse(JSON.stringify(entrySchema)); // easy deep copy

// viewing an entry in detail should show full medication details
entryViewSchema.required.push("medications");
entryViewSchema.properties.medications = {
    type:   "array",
    items:  {
        "$ref": "#/definitions/medication"
    }
};

// other endpoints should just have a list of medication IDs
entrySchema.required.push("medication_ids");
entrySchema.properties.medication_ids = {
    type:   "array",
    items:  {
        type:   "number"
    }
};

common.addApiChain("journal", {
    "createSuccess": function (respObj) {
        expect(respObj).to.be.an.api.postSuccess;
        expect(respObj).to.have.schema(entrySchema);
    },
    "viewSuccess": function (respObj) {
        expect(respObj).to.be.an.api.getSuccess;
        expect(respObj).to.have.schema(entryViewSchema);
    },
    "success": function (respObj) {
        expect(respObj).to.be.an.api.getSuccess;
        expect(respObj).to.have.schema(entrySchema);
    },
    "listSuccess": function (respObj) {
        expect(respObj).to.be.an.api.genericListSuccess("entries", entrySchema);
    }
});

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
                    return Q.nbind(otherPatient.createJournalEntry, otherPatient)({
                        text: "foobar",
                        date: (new Date()).toISOString()
                    });
                });
            });
        });

        it("rejects invalid journal IDs", function () {
            return expect(endpoint("foo", patient._id, user.accessToken)).to.be.an.api.error(404, "invalid_journal_id");
        });
        it("rejects journal IDs not corresponding to real entries", function () {
            return expect(endpoint(9999, patient._id, user.accessToken)).to.be.an.api.error(404, "invalid_journal_id");
        });
        it("rejects journal IDs corresponding to entries belonging to other patients", function () {
            var request = endpoint(otherPatient.entries[0]._id, patient._id, user.accessToken);
            return expect(request).to.be.an.api.error(404, "invalid_journal_id");
        });
    });
};
