"use strict";
var chakram         = require("chakram"),
    config          = require("../../config.js"),
    Q               = require("q"),
    userFixtures    = require("../users/fixtures.js");

var expect = chakram.expect;

// exports
var auth = {};

// helper function to check an endpoint requires authentication
// endpoint should be a function taking an access token and
// returning a chakram promise
auth.itRequiresAuthentication = function (endpoint) {
    it("requires an access token", function () {
        endpoint(undefined).then((result) => {
            return expect(result).to.be.an.api.error(401, "Unauthorized");
        })
    });
    it("rejects a blank access token", function () {
        endpoint("").then((result) => {
            return expect(result).to.be.an.api.error(401, "Unauthorized");
        })
        
    });
    it("rejects an invalid access token", function () {
        return expect(endpoint("foo")).to.be.an.api.error(401, "Unauthorized");
    });
};

// read in and store client secret from config.js file
var secret;
before(function () {
    secret = config.secret;
});

// generate authentication headers to send from an access token,
// sending the client secret as well
auth.genAuthHeaders = function (accessToken) {
    var headers = {
        "X-Client-Secret": secret
    };

    if (typeof accessToken !== "undefined")
        headers.Authorization = "Bearer " + accessToken;

    return { headers: headers };
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
auth.createTestUser = function (data) {
    var user;
    return userFixtures.create("User", data).then(function (u) {
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
