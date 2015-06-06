"use strict";

var mongoose = require('mongoose');

var User = mongoose.model('User');
var Patient = mongoose.model('Patient');

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
    var u = new User({
        email: email(),
        password: password(),
        name: name()
    });
    // save password as user.password will become the hash
    u.rawPassword = u.password;
    u.wrongPassword = u.password + 'wrong';
    u.wrongEmail = u.email + 'wrong';
    u.invalidEmail = "thisisnotanemail";
    return u;
}

function patient() {
    return new Patient({
        name: name()
    });
}

function time() {
    // pad natural nums to 2 digits
    function pad(num) {
        if (num < 10) return "0" + num.toString();
        else return num.toString();
    }

    // hour in [0, 23]
    var hour = Math.floor(Math.random() * (23 - 1));
    // minute in [0, 59]
    var minute = Math.floor(Math.random() * (59 - 1));
    return pad(hour) + ":" + pad(minute);
}

module.exports = {
    email: email,
    password: password,
    name: name,
    user: user,
    wake: time,
    sleep: time,
    breakfast: time,
    lunch: time,
    dinner: time,
    patient: patient,
    invalidAuthHeader: "not an auth header"
};
