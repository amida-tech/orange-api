"use strict";
var express = require("express"),
    npi     = require("npi-js"),
    errors  = require("../errors.js").ERRORS;

var router = module.exports = express.Router({ mergeParams: true });

router.get("/:npi", function (req, res, next) {
    var npi = req.params.npi;
    return res.send({
        business_address: {
            address_details_line: "2ND FLOOR",
            address_line: "2350 W EL CAMINO REAL",
            city: "MOUNTAIN VIEW",
            country_code: "US",
            state: "CA",
            zip: "940406203"
        },
        credential: "MD",
        enumeration_date: "2006-08-31T00:00:00.000Z",
        first_name: "HARRY",
        gender: "male",
        last_name: "DENNIS",
        last_update_date: "2012-01-10T00:00:00.000Z",
        npi: 1073624029,
        practice_address: {
            address_line: "795 EL CAMINO REAL",
            city: "PALO ALTO",
            country_code: "US",
            phone: "6508532992",
            state: "CA",
            zip: "943012302"
        },
        provider_details: [
            {
                healthcare_taxonomy_code: "208000000X",
                license_number: "G68571",
                license_number_state: "CA",
                taxonomy_switch: "yes"
            }
        ],
        sole_proprietor: "no",
        type: "individual"
    });
    // npi.find.getData(npi, function(err, response) {
    //     if (err) {
    //       return next(errors.BLOOM_ERROR);
    //     }
    //     return res.send(response[0] || {});
    // });
});
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
