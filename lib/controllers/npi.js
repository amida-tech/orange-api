"use strict";
var express = require("express"),
    npi     = require("npi-js"),
    errors  = require("../errors.js").ERRORS;

var router = module.exports = express.Router({ mergeParams: true });

router.post("/", function (req, res, next) {
    // search query
    var search = req.body.search;
    if (typeof search === "undefined" || search === null) search = {};

    npi.find.getNPI(search, function (err, results) {
        // catch errors communicating with the API
        if (err) {
            // no results found: we don't throw an error here but just
            // return no results
            if (err === "no matches found") {
                return res.send({
                    providers: [],
                    count: 0,
                    success: true
                });
            }

            return next(errors.BLOOM_ERROR);
        }

        // basic list response
        res.send({
            providers: results,
            count: results.length,
            success: true
        });
    });
});
