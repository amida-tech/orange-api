"use strict";

var chakram     = require("chakram");

var expect = chakram.expect;

// *must* do this on beforeEach: we may be overriding it on before
module.exports.beforeEach = function () {
    beforeEach(function () {
        // namespacing
        chakram.addProperty("habits", function () {} );

        // verify successful responses
        /*eslint-disable key-spacing */
        var habitsSchema = {
            required: ["wake", "sleep", "breakfast", "lunch", "dinner", "tz"],
            properties: {
                wake:       { type: ["string", "null"] },
                sleep:      { type: ["string", "null"] },
                breakfast:  { type: ["string", "null"] },
                lunch:      { type: ["string", "null"] },
                dinner:     { type: ["string", "null"] },
                tz:         { type: ["string"] }
            }
        };
        /*eslint-enable key-spacing */
        chakram.addProperty("success", function (respObj) {
            expect(respObj).to.be.an.api.getSuccess;
            expect(respObj).to.have.schema(habitsSchema);
        });
    });
};
