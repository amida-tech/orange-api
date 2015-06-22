"use strict";

var chakram     = require("chakram"),
    common      = require("../common/chakram.js");

var expect = chakram.expect;

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
common.addApiChain("habits", {
    "success": function (respObj) {
        expect(respObj).to.be.an.api.getSuccess;
        expect(respObj).to.have.schema(habitsSchema);
    }
});
