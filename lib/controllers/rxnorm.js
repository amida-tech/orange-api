"use strict";
var express     = require("express"),
    mongoose    = require("mongoose");

var router = module.exports = express.Router({ mergeParams: true });
var rxnorm = mongoose.model("RXNorm");

// query to find med groups
router.post("/group", function (req, res, next) {
    // medication name
    var medname = req.body.medname;
    if (typeof medname === "undefined" || medname === null) medname = "";

    rxnorm.queryRxNormGroup(medname, function (err, result) {
        if (err) return next(err);

        // basic object response
        // just return data as it's provided to us
        res.send({
            result: result,
            success: true
        });
    });
});

// query for misspellings
router.post("/spelling", function (req, res, next) {
    // medication name
    var medname = req.body.medname;
    if (typeof medname === "undefined" || medname === null) medname = "";

    rxnorm.queryRxNormSpelling(medname, function (err, rawResult) {
        if (err) return next(err);

        // rxnorm lib returns JSON for queryRxNormSpelling
        var result = JSON.parse(rawResult);
        // if no results are found, we should return an object rather than null
        if (result.suggestionGroup.suggestionList === null) {
            result.suggestionGroup.suggestionList = {
                suggestion: []
            };
        }

        // basic object response
        // just return data as it's provided to us
        res.send({
            result: result,
            success: true
        });
    });
});
