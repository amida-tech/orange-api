"use strict";

var mongoose  = require("mongoose"),
    Monky     = require("../common/monky.js");

var monky = module.exports = new Monky(mongoose);

/*eslint-disable key-spacing */
monky.factory("DocumentSignature", {
    documentName: "document #n",
    version: "#n"
});
/*eslint-enable key-spacing */
