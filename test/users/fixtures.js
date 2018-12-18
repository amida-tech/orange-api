"use strict";

var mongoose  = require("mongoose"),
    Monky     = require("../common/monky.js");

var monky = module.exports = new Monky(mongoose);

/*eslint-disable key-spacing */
monky.factory("User", {
    email:          "foo#n@bar.com",
    phone:          "6177140000",
    firstName:      "Foo #n",
    lastName:       "bar #n",
    role:           "user",
    organization:   "amida"
});
/*eslint-enable key-spacing */
