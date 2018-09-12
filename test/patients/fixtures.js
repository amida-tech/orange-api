"use strict";

var mongoose  = require("mongoose"),
    Monky     = require("../common/monky.js");

var monky = module.exports = new Monky(mongoose);

/*eslint-disable key-spacing */
monky.factory("Patient", {
    first_name: "Patient #n",
    last_name: "number #n",
    phone: "6177140000",
    sex: "male",
    birthdate: "1990-01-01",
    access_anyone: "write",
    access_family: "write",
    access_prime: "write"
});
/*eslint-enable key-spacing */
