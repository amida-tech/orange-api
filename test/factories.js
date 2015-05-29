"use strict";
var User = require('../lib/models/user.js');

// Don't save anything to the DB here

var emailCounter = 0;

function email(i) {
    if (typeof i === 'undefined') {
        emailCounter++;
        i = emailCounter;
    }
    return "foo" + i + "@bar.com";
}

function password() {
    return "foobar";
}

function name() {
    return "Foo Bar";
}

function user() {
    return new User({
        email: email(),
        password: password(),
        name: name()
    });
}

module.exports = {
    email: email,
    password: password,
    name: name,
    user: user
};
