"use strict";

var chakram     = require("chakram"),
    common      = require("../common/chakram.js");
var expect = chakram.expect;

// verify successful responses
/*eslint-disable key-spacing */
var requestSchema = module.exports.schema = {
    required: ["success", "id", "email"],
    properties: {
        success:    { type: "boolean" },
        id:         { type: "number" },
        email:      { type: "string" }
    },
    additionalProperties: false
};
/*eslint-enable key-spacing */
common.addApiChain("requests", {
    "createSuccess": function (respObj) {
        expect(respObj).to.be.an.api.postSuccess;
        expect(respObj).to.have.schema(requestSchema);
    },
    "success": function (respObj) {
        expect(respObj).to.be.an.api.getSuccess;
        expect(respObj).to.have.schema(requestSchema);
    },
    "listSuccess": function (respObj) {
        expect(respObj).to.be.an.api.genericListSuccess("requests", requestSchema);
    }
});
common.addApiChain("requested", {
    "createSuccess": function (respObj) {
        expect(respObj).to.be.an.api.postSuccess;
        expect(respObj).to.have.schema(requestSchema);
    },
    "success": function (respObj) {
        expect(respObj).to.be.an.api.getSuccess;
        expect(respObj).to.have.schema(requestSchema);
    },
    "listSuccess": function (respObj) {
        expect(respObj).to.be.an.api.genericListSuccess("requested", requestSchema);
    }
});
