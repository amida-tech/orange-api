"use strict";
var chakram         = require("chakram"),
    auth            = require("../common/auth.js");

var expect = chakram.expect;

describe("NPI", function () {
    describe("Query (POST /npi)", function () {
        // basic endpoint
        var query = function (data) {
            var headers = auth.genAuthHeaders(null); // adds X-Client-Secret header for us
            return chakram.post("http://localhost:3000/v1/npi", data, headers);
        };

        it("gracefully handles no data POSTed", function () {
            return expect(query({})).to.be.an.npi.success;
        });

        it("handles no results", function () {
            return expect(query({
                search: {}
            })).to.be.an.npi.success;
        });

        it("returns results for a valid query", function () {
            return query({
                search: {
                    name: [{
                        first: "Harry", //String, Optional
                        last: "Dennis" //String, required
                    }],
                    address: [{
                        state: "CA" //String, optional
                    }]
                }
            }).then(function (response) {
                expect(response).to.be.an.npi.success;
                expect(response.body.count).to.be.above(0);
                expect(response.body.count).to.equal(response.body.providers.length);
            });
        });
    });
});
