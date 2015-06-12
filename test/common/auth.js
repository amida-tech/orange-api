"use strict";

var chakram = require("chakram");

var expect = chakram.expect;

// helper function to check an endpoint requires authentication
// endpoint should be a getter function returning a
// function taking an access token and returning a chakram promise
module.exports.itRequiresAuthentication = function (endpointGetter) {
    it("should require an access token", function () {
        return expect(endpointGetter()(undefined)).to.be.an.api.error(401, "access_token_required");
    });
    it("should not accept a blank access token", function () {
        return expect(endpointGetter()("")).to.be.an.api.error(401, "invalid_access_token");
    });
    it("should not accept an invalid access token", function () {
        return expect(endpointGetter()("foo")).to.be.an.api.error(401, "invalid_access_token");
    });
};

// generate authentication headers to send from an access token
module.exports.genAuthHeaders = function (accessToken) {
    if (typeof accessToken === "undefined") return {};
    return {
        headers: {
            Authorization: "Bearer " + accessToken
        }
    };
};
