"use strict";
var chakram         = require("chakram"),
    auth            = require("../common/auth.js");

var expect = chakram.expect;

describe("RXNorm", function () {
    describe("Query For Spelling Suggestions (POST /rxnorm/spelling)", function () {
        // basic endpoint
        var query = function (data) {
            var headers = auth.genAuthHeaders(null); // adds X-Client-Secret header for us
            return chakram.post("http://localhost:3000/v1/rxnorm/spelling", data, headers);
        };

        it("gracefully handles no data POSTed", function () {
            return expect(query({})).to.be.an.rxnorm.spellingSuccess;
        });

        it("handles no medname specified", function () {
            return expect(query({
                medname: ""
            })).to.be.an.rxnorm.spellingSuccess;
        });

        it("handles a non-med-related medname specified", function () {
            // results
            return query({
                medname: "foobarbazthisshouldreallynotreturnanyresults"
            }).then(function (response) {
                expect(response).to.be.an.rxnorm.spellingSuccess;
                expect(response.body.result.suggestionGroup.suggestionList.suggestion.length).to.equal(0);
            });
        });

        it("handles a valid medname specified", function () {
            // results
            return query({
                medname: "allegrad"
            }).then(function (response) {
                expect(response).to.be.an.rxnorm.spellingSuccess;
                expect(response.body.result.suggestionGroup.suggestionList.suggestion.length).to.be.above(0);
            });
        });

        it("ignores suggestions with the name equal to the queried name", function () {
            return query({
                medname: "multivitamins"
            }).then(function (response) {
                expect(response).to.be.an.rxnorm.spellingSuccess;
                console.log(response.body.result.suggestionGroup.suggestionList);
                expect(response.body.result.suggestionGroup.suggestionList.suggestion.length).to.be.above(0);
                expect(response.body.result.suggestionGroup.suggestionList.suggestion).to.not.include("multivitamins");
                expect(response.body.result.suggestionGroup.suggestionList.suggestion).to.not.include("Multivitamins");
                expect(response.body.result.suggestionGroup.suggestionList.suggestion).to.not.include("MULTIVITAMINS");
            });
        });
    });
});
