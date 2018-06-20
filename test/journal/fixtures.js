"use strict";

var mongoose  = require("mongoose"),
    Monky     = require("../common/monky.js");

var monky = module.exports = new Monky(mongoose);

/*eslint-disable key-spacing */
monky.factory("JournalEntry", {
    date: (new Date()).toISOString(),
    text: "Lorem ipsum #n",
    medication_ids: [],
    mood: "Happy!",
    moodSeverity: 10,
    activity: "jogging",
    activityMinutes: 56,
    sideEffect: "affected side",
    sideEffectSeverity: 5,
    creator: "Adam West"
});
/*eslint-enable key-spacing */
