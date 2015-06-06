"use strict";
var util        = require("util"),
    async       = require("async"),
    factories   = require("../common/factories.js"),
    requests    = require("../common/requests.js"),
    Crud        = require("../common/crud.js"),
    auth        = require("../common/auth.js");

var crud = new Crud("User");

// check registraion succeeds for a given set of user data
var registersSuccessfully = async.apply(crud.successfullyCreates, "/user", ["email", "name"]);
// check registration fails with the specified error for a given set of user data
function registerFails (data, error) {
    return crud.failsToCreate("/user", data, 400, error);
};

describe("user registration (POST /user)", function () {
    describe("with full data", function () {
        registersSuccessfully(factories.user());
    });

    describe("with minimum working data", function () {
        registersSuccessfully(factories.minimumUser());
    });

    describe("with no email", function () {
        registerFails({
            name: factories.name(),
            password: factories.password()
        }, 'email_required');
    });

    describe("with no password", function () {
        registerFails({
            email: factories.email(),
            name: factories.name()
        }, 'password_required');
    });

    describe("with invalid email", function () {
        registerFails({
            name: factories.name(),
            password: factories.password(),
            email: factories.invalidEmail()
        }, 'invalid_email');
    });

    describe("with existing user", function () {
        var user = auth.newUser();
        before(function (done) {
            // save the user above
            user.save(done);
        });
        registerFails(user, 'user_already_exists');
    });
});
