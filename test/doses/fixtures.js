"use strict";

var mongoose  = require("mongoose"),
    Monky     = require("../common/monky.js");

var monky = module.exports = new Monky(mongoose);

/*eslint-disable key-spacing */
monky.factory("Dose", {
    date: (new Date()).toISOString(),
    notes: "Lorem ipsum #n",
    taken: true
});
/*eslint-enable key-spacing */
