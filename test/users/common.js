"use strict";

var chakram = require("chakram"),
    common  = require("../common/chakram.js"),
    auth    = require("../common/auth.js");

var expect = chakram.expect;

// verify successful responses
/*eslint-disable key-spacing */
var userSchema = {
    required: ["email", "first_name", "last_name", "phone", "success", "role"],
    properties: {
        success:      { type: "boolean" },
        email:        { type: "string" },
        first_name:   { type: "string" },
        last_name:    { type: "string" },
        phone:        { type: "string" },
        role:         { type: "string" },
        organization: { type: "string" },
        avatar:       { type: "string" },
        deviceToken:  { type: "string" },
        gcmToken:     { type: "string" },
        npi:          { type: "string" },
        defaultPatientID: { type: "string"}
    },
    additionalProperties: false
};
var tokenSchema = {
    required: ["access_token", "success"],
    properties: {
        success:        { type: "boolean" },
        access_token:   { type: "string" }
    },
    additionalProperties: false
};
/*eslint-enable key-spacing */
common.addApiChain("user", {
    "registerSuccess": function (respObj) {
        expect(respObj).to.be.an.api.postSuccess;
        expect(respObj).to.have.schema(userSchema);
    },
    "success": function (respObj) {
        expect(respObj).to.be.an.api.getSuccess;
        expect(respObj).to.have.schema(userSchema);
    }
});
common.addApiChain("authentication", {
    "success": function (respObj) {
        expect(respObj).to.be.an.api.postSuccess;
        expect(respObj).to.have.schema(tokenSchema);
    }
});

// common endpoints
// view user info
module.exports.view = function (accessToken) {
    return chakram.get("http://localhost:5000/v1/user", auth.genAuthHeaders(accessToken));
};
