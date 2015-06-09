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

// fixed name, phone, etc
factories.name = function () {
    return "Foo Bar";
}
factories.phone = function () {
    return "(617) 617-6177";
}
factories.invalidPhone = function () {
    return "foobar";
}
factories.address = function () {
    return "1 Main Street, Cambridge, MA, 02139";
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
    };
};
factories.minimumUser = function () {
    return {
        email: factories.email(),
        password: factories.password()
    };
};

// patients
factories.patient = function () {
    return {
        name: factories.name()
    };
}

// patient resources
factories.doctor = function () {
    return {
        name: factories.name(),
        phone: factories.phone(),
        address: factories.address()
    };
}
