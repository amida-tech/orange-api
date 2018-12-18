"use strict";

var chakram     = require("chakram"),
    common      = require("../common/chakram.js");

var expect = chakram.expect;

// verify successful responses
/*eslint-disable key-spacing */
var documentSignatureSchema = module.exports.schema = {
    required: ["success", "id", "documentName", "version", "dateSigned"],
    properties: {
        success:        { type: "boolean" },
        id:             { type: "number" },
        documentName:   { type: "string" },
        version:        { type: "string" },
        dateSigned:     { type: "string" }
    },
    additionalProperties: false
};
/*eslint-enable key-spacing */
common.addApiChain("documentSignature", {
    "createSuccess": function (respObj) {
        expect(respObj).to.be.an.api.postSuccess;
        expect(respObj).to.have.schema(documentSignatureSchema);
    },
    "success": function (respObj) {
        expect(respObj).to.be.an.api.getSuccess;
        expect(respObj).to.have.schema(documentSignatureSchema);
    },
    "listSuccess": function (respObj) {
        expect(respObj).to.be.an.api.genericListSuccess("documentSignatures", documentSignatureSchema);
    }
});
