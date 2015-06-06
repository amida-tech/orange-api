"use strict";

var util = require("util");

var factories = module.exports = {};

// generate unique emails
var emailCounter = 0;
factories.email = function () {
    emailCounter++;
    return util.format("foo%d@bar.com", emailCounter);
};
factories.invalidEmail = function () {
    emailCounter++;
    return util.format("foo%dnbaracom", emailCounter);
};

// incrementing passwords
var passwordCounter = 0;
factories.password = function () {
    passwordCounter++;
    return util.format("password%d", passwordCounter);
};

// fixed name
factories.name = function () {
    return "Foo Bar";
}

// access tokens
factories.invalidAccessToken = function () {
    return "notanaccesstoken";
}


// different user types
factories.user = function () {
    return {
        email: factories.email(),
        name: factories.name(),
        password: factories.password()
    }
};
factories.minimumUser = function () {
    return {
        email: factories.email(),
        password: factories.password()
    }
};
