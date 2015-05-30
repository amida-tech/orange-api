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
    dinner: time
};
