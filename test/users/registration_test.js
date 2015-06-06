"use strict";
var util        = require("util"),
    factories   = require("../common/factories.js"),
    requests    = require("../common/requests.js"),
    Crud        = require("../common/crud.js"),
    auth        = require("../common/auth.js");

var crud = new Crud("User");

// check registraion succeeds for a given set of user data
function registersSuccessfully(data) {
    describe(util.format("when the user data is '%j'", data), function () {
        crud.successfullyCreates("/user", data, ["email", "name"]);
    });
}

// check registration fails with the specified error for a given set of user data
function registerFails(data, error) {
    describe(util.format("when the user data is '%j'", data), function () {
        crud.failsToCreate("/user", data, 400, [error]);
    });
}

describe("user registration (POST /user)", function () {
    registersSuccessfully(factories.user());
    registersSuccessfully(factories.minimumUser());
    registerFails({
        name: factories.name(),
        password: factories.password()
    }, 'email_required');
    registerFails({
        email: factories.email(),
        name: factories.name()
    }, 'password_required');
    registerFails({
        name: factories.name(),
        password: factories.password(),
        email: factories.invalidEmail()
    }, 'invalid_email');

    describe("with existing user", function () {
        var user = auth.newUser();
        before(function (done) {
            // save the user above
            user.save(done);
        });
        registerFails(user, 'user_already_exists');
    });
});
