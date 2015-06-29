"use strict";

var chakram     = require("chakram"),
    common      = require("../common/chakram.js");
var expect = chakram.expect;

// verify successful responses
/*eslint-disable key-spacing */
var medicationSchema = {
    required: ["id", "name", "rx_norm", "ndc", "dose", "route", "form", "rx_number",
                "quantity", "type", "schedule", "fill_date", "number_left"],
    properties: {
        id:             { type: "number" },
        name:           { type: "string" },
        rx_norm:        { type: "string" },
        ndc:            { type: "string" },
        dose:           {
            type:           ["object", "null"],
            required:       ["quantity", "unit"],
            properties:     {
                quantity:       { type: "number" },
                unit:           { type: "string" }
            }
        },
        route:          { type: "string" },
        form:           { type: "string" },
        rx_number:      { type: "string" },
        fill_date:      { type: ["string", "null"] },
        number_left:    { type: ["number", "null"] },
        quantity:       { type: "number" },
        type:           { type: "string" },
        schedule:       { type: "object" }, // TODO: full schedule schema here
        doctor_id:      { type: ["number", "null"] },
        pharmacy_id:    { type: ["number", "null"] },
        doctor:         { type: ["object", "null"] }, // TODO: full doctor schema here
        pharmacy:       { type: ["object", "null"] } // TODO: full pharmacy schema here
    }
};
/*eslint-enable key-spacing */
var medicationViewSchema = JSON.parse(JSON.stringify(medicationSchema)); // easy deep copy
medicationViewSchema.required.push("doctor");
medicationViewSchema.required.push("pharmacy");
medicationSchema.required.push("doctor_id");
medicationSchema.required.push("pharmacy_id");
common.addApiChain("medication", {
    "createSuccess": function (respObj) {
        expect(respObj).to.be.an.api.postSuccess;
        expect(respObj).to.have.schema(medicationSchema);
    },
    "viewSuccess": function (respObj) {
        expect(respObj).to.be.an.api.getSuccess;
        expect(respObj).to.have.schema(medicationViewSchema);
    },
    "success": function (respObj) {
        expect(respObj).to.be.an.api.getSuccess;
        expect(respObj).to.have.schema(medicationSchema);
    }
});
