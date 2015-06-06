"use strict";
var util        = require("util"),
    async       = require("async"),
    factories   = require("../common/factories.js"),
    requests    = require("../common/requests.js"),
    Crud        = require("../common/crud.js"),
    auth        = require("../common/auth.js");

var crud = new Crud("User");

// check changing info succeeds for a given set of user data
var changesSuccessfully = async.apply(crud.successfullyEdits, "/user", ["email", "name"]);

// check registration fails with the specified error for a given set of user data
var changeFails = async.apply(crud.failsToEdit, "/user");

describe("edit user info (PUT /user)", function () {
    auth.setupTestUser(this);
    auth.requiresAuthentication(async.apply(changeFails, {})); // no data

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
