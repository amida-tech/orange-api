"use strict";
var chakram         = require("chakram"),
    config          = require("../../config.js"),
    Q               = require("q"),
    signJWT         = require("./jwt").signJWT,
    userFixtures    = require("../users/fixtures.js");

var expect = chakram.expect;

// exports
var auth = {};

// helper function to check an endpoint requires authentication
// endpoint should be a function taking an access token and
// returning a chakram promise
auth.itRequiresAuthentication = function (endpoint) {
    it("requires an access token", function () {
        const request = endpoint(undefined);
        return request.then(function (response) {
            expect(response.body).to.equal("Unauthorized");
        });
    });
    it("rejects a blank access token", function () {
        const request = endpoint("foo");
        return request.then(function (response) {
            expect(response.body).to.equal("Unauthorized");
        });
    });
    it("rejects an invalid access token", function () {
        const request = endpoint("foo");
        return request.then(function (response) {
            expect(response.body).to.equal("Unauthorized");
        });
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
var currId = 0;
auth.genAccessToken = function (user) {
    currId += 1;
    // generate access token
    var deferred = Q.defer();
    var token = signJWT({
        id: currId,
        username: user.email,
        email: user.email,
        scopes: [user.role]
    });
    deferred.resolve(token);
    return deferred.promise;
};

auth.genAdminAccessToken = function () {
    // generate access token
    var deferred = Q.defer();
    var token = signJWT({
        id: 0,
        username: "admin",
        email: "admin@dm.n",
        scopes: ["admin"]
    });
    deferred.resolve(token);
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
        return view.then(function (response) {
            return expect(response.body).to.equal("Unauthorized");
        });
    };
};

module.exports = auth;
