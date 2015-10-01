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
        var suggestions = result.suggestionGroup.suggestionList;
        if (typeof suggestions === "undefined" || suggestions === null) {
            result.suggestionGroup.suggestionList = {
                suggestion: []
            };
        }

        // remove results identical to the query
        // (prevents looping suggestions in the UI)
        result.suggestionGroup.suggestionList.suggestion = suggestions.suggestion.filter(function (suggestion) {
            return suggestion.toLowerCase().trim() !== medname.toLowerCase().trim();
        });

        // basic object response
        // just return data as it's provided to us
        res.send({
            result: result,
            success: true
        });
    });
});
