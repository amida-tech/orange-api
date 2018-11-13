"use strict";

var mongoose  = require("mongoose"),
    Monky     = require("../common/monky.js");

var monky = module.exports = new Monky(mongoose);

/*eslint-disable key-spacing */
monky.factory("FormularyEntry", {
    vaClass:     "AB#n",
    genericName: "MEDICATION #n",
    dosageform:  "TAB",
    restriction: "",
    comments:    ""
});
/*eslint-enable key-spacing */
