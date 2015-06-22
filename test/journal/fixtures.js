"use strict";

var mongoose  = require("mongoose"),
    Monky     = require("../common/monky.js");

var monky = module.exports = new Monky(mongoose);

/*eslint-disable key-spacing */
monky.factory("JournalEntry", {
    date: (new Date()).toISOString(),
    text: "Lorem ipsum #n",
    medication_ids: [],
    mood: "Happy!"
});
/*eslint-enable key-spacing */
