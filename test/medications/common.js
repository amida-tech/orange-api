"use strict";

var chakram = require("chakram");
var expect = chakram.expect;

// *must* do this on beforeEach: we may be overriding it on before
module.exports.beforeEach = function () {
    beforeEach(function () {
        // namespacing
        chakram.addProperty("medication", function () {} );

        // verify successful responses
        /*eslint-disable key-spacing */
        var medicationSchema = {
            required: ["id", "name", "rx_norm", "ndc", "dose", "route", "form", "rx_number",
                        "quantity", "type", "schedule", "doctor_id", "pharmacy_id"],
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
                quantity:       { type: "number" },
                type:           { type: "string" },
                schedule:       { type: "object" }, // TODO: full schedule schema here
                doctor_id:      { type: ["number", "null"] },
                pharmacy_id:    { type: ["number", "null"] }
            }
        };
        /*eslint-enable key-spacing */
        chakram.addProperty("success", function (respObj) {
            expect(respObj).to.be.an.api.getSuccess;
            expect(respObj).to.have.schema(medicationSchema);
        });
        chakram.addProperty("createSuccess", function (respObj) {
            expect(respObj).to.be.an.api.postSuccess;
            expect(respObj).to.have.schema(medicationSchema);
        });
    });
};
