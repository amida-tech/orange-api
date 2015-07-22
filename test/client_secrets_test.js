"use strict";
var fs          = require("fs"),
    Q           = require("q"),
    chakram     = require("chakram"),
    config      = require("../config.js"),
    fixtures    = require("./users/fixtures.js");

var expect = chakram.expect;

describe("API", function () {
    // read in secret from config.js file
    var secret;
    before(function () {
        secret = config.secret;
    });

    // sample endpoint to hit
    var endpoint = function (secret) {
        // want an endpoint that doesn't require any other authenticate, so we
        // try and register a user
        return fixtures.build("User", {}).then(function (user) {
            var headers = {};
            if (typeof secret !== "undefined") headers["X-Client-Secret"] = secret;

            return chakram.post("http://localhost:3000/v1/user", user, { headers: headers });
        });
    };


    it("accepts a valid client secret", function () {
        return expect(endpoint(secret)).to.be.an.api.genericSuccess();
    });
    it("rejects a nonpresent client secret", function () {
        return expect(endpoint(undefined)).to.be.an.api.error(401, "invalid_client_secret");
    });
    it("rejects a null client secret", function () {
        return expect(endpoint(null)).to.be.an.api.error(401, "invalid_client_secret");
    });
    it("rejects an invalid client secret", function () {
        return expect(endpoint("nottheclientsecret")).to.be.an.api.error(401, "invalid_client_secret");
    });
});
