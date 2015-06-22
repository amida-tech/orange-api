"use strict";

var chakram = require("chakram"),
    common  = require("../common/chakram.js"),
    auth    = require("../common/auth.js");

var expect = chakram.expect;

// verify successful responses
/*eslint-disable key-spacing */
var userSchema = {
    required: ["email", "name"],
    properties: {
        email: { type: "string" },
        name:  { type: "string" }
    }
};
var tokenSchema = {
    required: ["access_token"],
    properties: {
        access_token: { type: "string" }
    }
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
    return chakram.post("http://localhost:3000/v1/auth/token", credentials);
};
