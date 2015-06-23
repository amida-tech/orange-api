"use strict";

var mongoose  = require("mongoose"),
    Monky     = require("../common/monky.js");

var monky = module.exports = new Monky(mongoose);

/*eslint-disable key-spacing */
monky.factory("Medication", {
    name: "Medication number #n",
    rx_norm: "324026",
    ndc: "33261-0228",
    dose: {
        quantity: 100,
        unit: "mg"
    },
    route: "oral",
    form: "pill",
    rx_number: "123456789",
    quantity: 50,
    type: "OTC"
});
/*eslint-enable key-spacing */
