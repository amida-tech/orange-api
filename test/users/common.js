"use strict";

var chakram = require("chakram"),
    auth    = require("../common/auth.js");

var expect = chakram.expect;

// *must* do this on beforeEach: we may be overriding it on before
beforeEach(function () {
    // namespacing
    chakram.addProperty("user", function () {} );

    // verify successful responses
    /*eslint-disable key-spacing */
    var userSchema = {
        required: ["email", "name"],
        properties: {
            email: { type: "string" },
            name:  { type: "string" }
        }
    };
    /*eslint-enable key-spacing */
    chakram.addProperty("registerSuccess", function (respObj) {
        expect(respObj).to.be.an.api.postSuccess;
        expect(respObj).to.have.schema(userSchema);
    });
    chakram.addProperty("success", function (respObj) {
        expect(respObj).to.be.an.api.getSuccess;
        expect(respObj).to.have.schema(userSchema);
    });
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
