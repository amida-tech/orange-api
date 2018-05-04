"use strict";

var mongoose  = require("mongoose"),
    Monky     = require("../common/monky.js");

var monky = module.exports = new Monky(mongoose);

/*eslint-disable key-spacing */
monky.factory("JournalEntry", {
    date: {utc: (new Date()).toISOString(), timezone:  "America/Los_Angeles"},
    text: "Lorem ipsum #n",
    medication_ids: [],
    mood: "Happy!"
});
/*eslint-enable key-spacing */
