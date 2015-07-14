"use strict";

// parse a positive integer query parameter
module.exports.parseNatural = function (raw, defaultValue) {
    // when not specified
    if (typeof raw === "undefined" || raw === null || raw === "") return defaultValue;

    // try and parse
    var value = ~~Number(raw); // ~~ truncates fractional parts
    if (String(value) !== raw || value < 0) return null; // error

    // return parsed value
    return value;
};

// parse a string query parameters and check it's in a list of allowed values
module.exports.parseString = function (raw, allowedValues, defaultValue) {
    // when not specified
    if (typeof raw === "undefined" || raw === null || raw === "") return defaultValue;

    if (allowedValues.indexOf(raw) >= 0) return raw;

    // error
    return null;
};
