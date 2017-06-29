"use strict";
var chakram     = require("chakram");

var expect = chakram.expect;

describe("Health Check", function () {

    // sample endpoint to hit
    var endpoint = function () {
        // want an endpoint that doesn't require any other authenticate, so we
        // try and register a user
        return chakram.get("http://localhost:5000/v1/health");
    };

    it("returns 200 OK", function () {
        return expect(endpoint()).to.be.an.api.genericSuccess(200);
    });

});
