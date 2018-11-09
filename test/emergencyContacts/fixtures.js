"use strict";

var mongoose  = require("mongoose"),
    Monky     = require("../common/monky.js");

var monky = module.exports = new Monky(mongoose);

/*eslint-disable key-spacing */
monky.factory("EmergencyContact", {
    firstName: "Jim",
    lastName: "Jimmson",
    primaryPhone: "(540) 555-5555",
    secondaryPhone: "(703) 555-5555",
    relation: "Father",
    email: "jim.jimmson@example.com"
});
/*eslint-enable key-spacing */
