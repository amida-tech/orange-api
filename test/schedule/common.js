"use strict";

var chakram     = require("chakram"),
    extend      = require("xtend"),
    common      = require("../common/chakram.js");
var expect = chakram.expect;

// verify successful responses
/*eslint-disable key-spacing */
// one 'event' item within the schedule
var scheduleItemSchema = {
    required: ["type", "date", "medication_id", "happened", "take_with_food", "take_with_medications",
               "take_without_medications"],
    properties: {
        type:                       { type: "string" },
        date:                       { type: "string" },
        happened:                   { type: "boolean" },
        medication_id:              { type: "number" },
        take_with_food:             { type: ["boolean", "null"] },
        take_with_medications:      {
            type:   "array",
            items:  { type: "number" }
        },
        take_without_medications:   {
            type:   "array",
            items:  { type: "number" }
        },
        took_medication:            { type: "boolean" },
        delay:                      { type: "number" },
        notification:               { type: "string" },
        dose_id:                    { type: "number" },
        scheduled:                  { type: "number" },
        patient_id:                 { type: "number" }
    },
    additionalProperties: false
};
// overall schedule stats
var statsSchema = {
    required: ["took_medication", "delay", "delta"],
    properties: {
        took_medication:    { type: ["number", "null"] },
        delay:              { type: ["number", "null"] },
        delta:              { type: ["number", "null"] }
    },
    additionalProperties: false
};
var scheduleSchema = {
    required: ["schedule", "statistics", "success"],
    properties: {
        success:  { type: "boolean" },
        schedule: {
            type:   "array",
            items:  scheduleItemSchema
        },
        statistics: extend(statsSchema, { type: "object" })
    },
    additionalProperties: false
};
/*eslint-enable key-spacing */

common.addApiChain("schedule", {
    "success": function (respObj) {
        expect(respObj).to.be.an.api.getSuccess;
        expect(respObj).to.have.schema(scheduleSchema);
    }
});

