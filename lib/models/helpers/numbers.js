"use strict";

// check number && integer && strictly positive
module.exports.isNatural = function (d) {
    return (typeof d === "number") && (d % 1 === 0) && (d > 0);
};
module.exports.isPositive = function (d) {
    return (typeof d === "number") && (d > 0);
};
