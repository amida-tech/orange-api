"use strict";

var chakram = require("chakram"),
    common  = require("../common/chakram.js"),
    auth    = require("../common/auth.js");

var expect = chakram.expect;

// verify successful responses
/*eslint-disable key-spacing */
var userSchema = {
    required: ["email", "name", "success"],
    properties: {
        success:    { type: "boolean" },
        email:      { type: "string" },
        name:       { type: "string" }
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
    return chakram.get("http://localhost:3000/v1/user", auth.genAuthHeaders(accessToken));
};

// generate access token
module.exports.token = function (credentials) {
    // auth.genAuthHeaders(undefined) sets X-Client-Secret for us, and doesn't set any
    // access token header
    return chakram.post("http://localhost:3000/v1/auth/token", credentials, auth.genAuthHeaders(undefined));
};
