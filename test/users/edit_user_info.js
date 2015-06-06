"use strict";
var util        = require("util"),
    factories   = require("../common/factories.js"),
    requests    = require("../common/requests.js"),
    Crud        = require("../common/crud.js"),
    auth        = require("../common/auth.js");

var crud = new Crud("User");

// check changing info succeeds for a given set of user data
function changesSuccessfully(data, accessToken) {
    describe(util.format("when the new info is '%j'", data), function () {
        crud.successfullyEdits("/user", data, ["email", "name"], accessToken);
    });
}

// check registration fails with the specified error for a given set of user data
function changeFails(data, accessToken, responseCode, error) {
    describe(util.format("when the new info is '%j'", data), function () {
        crud.failsToEdit("/user", data, responseCode, [error], accessToken);
    });
}

describe("edit user info (PUT /user)", function () {
    auth.setupTestUser(this);
    auth.requiresAuthentication(changeFails);

    describe("when changing name", function () {
        changesSuccessfully({name: factories.name()}, this.accessTokenGetter);

        describe("(testing our access tokens not revoked)", function () {
            crud.successfullyShows("/user", ["email", "name"], this.accessTokenGetter);
        }.bind(this));
    }.bind(this));

    describe("when changing password", function () {
        changesSuccessfully({password: factories.password()}, this.accessTokenGetter);

        describe("(testing our access tokens revoked)", function () {
            crud.failsToShow("/user", 401, ["invalid_access_token"], this.accessTokenGetter);
        }.bind(this));
    }.bind(this));
});
