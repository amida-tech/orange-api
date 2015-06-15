"use strict";

var chakram         = require("chakram"),
    Q               = require("q"),
    userFixtures    = require("../users/fixtures.js");

var expect = chakram.expect;

// exports
var auth = {};

// helper function to check an endpoint requires authentication
// endpoint should be a function taking an access token and
// returning a chakram promise
auth.itRequiresAuthentication = function (endpoint) {
    it("should require an access token", function () {
        return expect(endpoint(undefined)).to.be.an.api.error(401, "access_token_required");
    });
    it("should not accept a blank access token", function () {
        return expect(endpoint("")).to.be.an.api.error(401, "invalid_access_token");
    });
    it("should not accept an invalid access token", function () {
        return expect(endpoint("foo")).to.be.an.api.error(401, "invalid_access_token");
    });
};

// generate authentication headers to send from an access token
auth.genAuthHeaders = function (accessToken) {
    if (typeof accessToken === "undefined") return {};
    return {
        headers: {
            Authorization: "Bearer " + accessToken
        }
    };
};

// generate access token from user, promise-style
auth.genAccessToken = function (user) {
    // generate access token
    var deferred = Q.defer();
    user.generateSaveAccessToken(function (err, t) {
        if (err) return deferred.reject(err);
        deferred.resolve(t);
    });
    return deferred.promise;
};

// create a new user from the factory and generate an access token,
// returning user with user.accessToken present
auth.createTestUser = function () {
    var user;
    return userFixtures.create("User").then(function (u) {
        user = u;
        return user;
    }).then(auth.genAccessToken).then(function (t) {
        user.accessToken = t;
        return user;
    });
};

// check access token is valid by GETting /user
auth.checkTokenWorks = function (token) {
    return function () {
        // circular dependency so require here
        var view = require("../users/common.js").view(token);
        return expect(view).to.be.an.api.getSuccess;
    };
};
// check access token is invalid (with `invalid_access_token' error) by GETting /user
auth.checkTokenFails = function (token) {
    return function () {
        // circular dependency so require here
        var view = require("../users/common.js").view(token);
        return expect(view).to.be.an.api.error(401, "invalid_access_token");
    };
};

module.exports = auth;
