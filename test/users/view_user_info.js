"use strict";
var util        = require("util"),
    async       = require("async"),
    factories   = require("../common/factories.js"),
    requests    = require("../common/requests.js"),
    Crud        = require("../common/crud.js"),
    auth        = require("../common/auth.js");

var crud = new Crud("User");

// check we successfuly return a response
var showsSuccessfully = async.apply(crud.successfullyShows, "/user", ["email", "name"]);
// check we get an error response with the specified error
var showFails = async.apply(crud.failsToShow, "/user");

describe("view user info (GET /user)", function () {
    auth.setupTestUser(this);
    auth.requiresAuthentication(showFails);

    showsSuccessfully(this.accessTokenGetter);
});
