"use strict";

var chakram     = require("chakram"),
    common      = require("../common/chakram.js");
var expect = chakram.expect;

// verify successful responses
common.addApiChain("npi", {
    "success": function (respObj) {
        // don't check the schema of actual items returned
        expect(respObj).to.be.an.api.genericListSuccess("providers", { additionalProperties: true });
    }
});
