"use strict";

var mongoose  = require("mongoose"),
    Monky     = require("../common/monky.js");

var monky = module.exports = new Monky(mongoose);

/*eslint-disable key-spacing */
monky.factory("Doctor", {
    name: "Dr. #n",
    phone: "(617) 716-6176",
    address: "#n Medical Way, Washington, DC, 20052",
    notes: "Lorem ipsum",
    title: "Primary Care Physician"
});
/*eslint-enable key-spacing */
