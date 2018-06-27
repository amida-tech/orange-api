"use strict";

var mongoose  = require("mongoose"),
    Monky     = require("../common/monky.js");

var monky = module.exports = new Monky(mongoose);

/*eslint-disable key-spacing */
monky.factory("Dose", {
    date: (new Date()).toISOString(),
    dose: {unit: "unit", quantity:1},
    notes: "Lorem ipsum #n",
    taken: true,
    creator: "adam@west.com",
    scheduled: null
});
/*eslint-enable key-spacing */
