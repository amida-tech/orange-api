"use strict";
var chakram         = require("chakram"),
    auth            = require("../common/auth.js");

var expect = chakram.expect;

describe("RXNorm", function () {
    describe("Query For Group (POST /rxnorm/group)", function () {
        // basic endpoint
        var query = function (data) {
            var headers = auth.genAuthHeaders(null); // adds X-Client-Secret header for us
            return chakram.post("http://localhost:3000/v1/rxnorm/group", data, headers);
        };

        it("gracefully handles no data POSTed", function () {
            return expect(query({})).to.be.an.rxnorm.groupSuccess;
        });

        it("handles no medname specified", function () {
            return expect(query({
                medname: ""
            })).to.be.an.rxnorm.groupSuccess;
        });

        it("handles a medname specified", function () {
            // no results
            return query({
                medname: "allegrad"
            }).then(function (response) {
                expect(response).to.be.an.rxnorm.groupSuccess;
                expect(response.body.result.compiled.length).to.equal(0);
            });
        });

        it("handles a valid medname specified", function () {
            // results
            return query({
                medname: "Allegra-D"
            }).then(function (response) {
                expect(response).to.be.an.rxnorm.groupSuccess;
                expect(response.body.result.compiled.length).to.be.above(0);
            });
        });

        it("handles the API being down");
    });
});
