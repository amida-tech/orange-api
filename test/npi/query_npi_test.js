"use strict";
var chakram         = require("chakram"),
    auth            = require("../common/auth.js");

var expect = chakram.expect;

describe("NPI", function () {
    describe("Query (POST /npi)", function () {
        // basic endpoint
        var query = function (data) {
            var headers = auth.genAuthHeaders(null); // adds X-Client-Secret header for us
            return chakram.post("http://localhost:5000/v1/npi", data, headers);
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
    describe("Get Data (GET /npi/:npi)", function () {
        // basic endpoint
        var getData = function (npi) {
            var headers = auth.genAuthHeaders(null);
            return chakram.get(`http://localhost:5000/v1/npi/${npi}`, headers);
        };
        it("gracefully handles invalid npi", function () {
            return getData("42").then(function (response) {
                expect(response.body).to.be.an("object");
                expect(response.body).to.be.empty;
            });
        });
        it("returns results for a valid npi", function () {
            return getData("1245319599").then(function (response) {
                expect(response.body).to.be.an("object");
                expect(response.body).to.have.property("number", 1245319599);
                expect(response.body.basic).to.be.an("object");
                expect(response.body.basic).to.have.property("last_name", "SAMPLE");
            });
        });
    });
});
