"use strict";

var chakram     = require("chakram"),
    Q           = require("q"),
    common      = require("../common/chakram.js"),
    patients    = require("../patients/common.js"),
    auth        = require("../common/auth.js");
var expect = chakram.expect;

// verify successful responses
/*eslint-disable key-spacing */
var shareSchema = {
    required: ["id", "email", "access", "group", "is_user"],
    properties: {
        id:         { type: "number" },
        email:      { type: "string" },
        access:     { type: "string" },
        group:      { type: "string" },
        is_user:    { type: "boolean" }
    }
};
common.addApiChain("share", {
    "createSuccess": function (respObj) {
        expect(respObj).to.be.an.api.postSuccess;
        expect(respObj).to.have.schema(shareSchema);
    },
    "success": function (respObj) {
        expect(respObj).to.be.an.api.getSuccess;
        expect(respObj).to.have.schema(shareSchema);
    },
    "listSuccess": function (respObj) {
        expect(respObj).to.be.an.api.genericListSuccess("shares", shareSchema);
    }
});
