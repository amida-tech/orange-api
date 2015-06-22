"use strict";

var Monky   = require("monky"),
    Q       = require("q");

// wrapper around Monky to use Q-style promises
module.exports = function (mongoose) {
    var monky = new Monky(mongoose);

    // Chakram uses Q promises and assumes they respond to isFulfilled()
    // Monky uses mpromise, so we have to wrap it in a Q promise
    monky.build = Q.nbind(monky.build, monky);
    monky.create = Q.nbind(monky.create, monky);

    return monky;
};
