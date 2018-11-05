"use strict";
var chakram         = require("chakram"),
    mongoose        = require("mongoose"),
    util            = require("util"),
    Q               = require("q"),
    querystring     = require("querystring"),
    auth            = require("../common/auth.js"),
    fixtures        = require("./fixtures.js");

var FormularyEntry = mongoose.model("FormularyEntry");

var expect = chakram.expect;

describe("FormularyEntry", function () {
    describe("Search formulary (GET /formulary/search)", function () {
        // basic endpoint
        var list = function (parameters) {
            if (typeof parameters === "undefined" || parameters === null) parameters = {};
            var query = querystring.stringify(parameters);

            var url = util.format("http://localhost:5000/v1/formulary/search?%s", query);
            return chakram.get(url, auth.genAuthHeaders());
        };

        describe("with formulary entries set up", function () {
            // setup 40 entries
            before(function () {
                // generate promise to create each entry
                var promises = [];
                var create = function (data) {
                    return fixtures.create("FormularyEntry", data);
                };

                // create 1 user with a custom name
                promises.push(function () {
                    return create({
                        genericName: "test substring matching",
                        vaClass: "YZ999"
                    });
                });
                // create 39 entries with default data, to give a total of 40
                // (includes the initial custom one created)
                for (var i = 0; i < 39; i++) {
                    /*eslint-disable no-loop-func */
                    promises.push(function () {
                        return create();
                    });
                    /*eslint-enable no-loop-func */
                }

                // run promises sequentially with reduce
                return promises.reduce(function (promise, f) {
                    return promise.then(f);
                }, Q());
            });

            it("returns a successful response", function () {
                return list().then(function (response) {
                    expect(response.body.success).to.equal(true);
                });
            });

            it("returns the correct count", function () {
                return list().then(function (response) {
                    expect(response.body.count).to.equal(40);
                });
            });

            describe("with limit parameter", function () {
                it("limits results to 25 by default", function () {
                    return list().then(function (response) {
                        expect(response.body.success).to.equal(true);
                        expect(response.body.formularyEntries.length).to.equal(25);
                        expect(response.body.count).to.equal(40);
                    });
                });

                it("lets us limit the results to less than 25", function () {
                    return list({ limit: 15 }).then(function (response) {
                        expect(response.body.success).to.equal(true);
                        expect(response.body.formularyEntries.length).to.equal(15);
                        expect(response.body.count).to.equal(40);
                    });
                });

                it("lets us limit the results to between 25 and 40", function () {
                    return list({ limit: 30 }).then(function (response) {
                        expect(response.body.success).to.equal(true);
                        expect(response.body.formularyEntries.length).to.equal(30);
                        expect(response.body.count).to.equal(40);
                    });
                });

                it("lets us limit the results to greater than 40, but caps at 40", function () {
                    return list({ limit: 50 }).then(function (response) {
                        expect(response.body.success).to.equal(true);
                        expect(response.body.formularyEntries.length).to.equal(40);
                        expect(response.body.count).to.equal(40);
                    });
                });

                it("ignores a null limit parameter", function () {
                    return list({ limit: null }).then(function (response) {
                        expect(response.body.success).to.equal(true);
                        expect(response.body.formularyEntries.length).to.equal(25);
                        expect(response.body.count).to.equal(40);
                    });
                });

                it("allows a zero limit parameter to return all results", function () {
                    return list({ limit: 0 }).then(function (response) {
                        expect(response.body.success).to.equal(true);
                        expect(response.body.formularyEntries.length).to.equal(40);
                        expect(response.body.count).to.equal(40);
                    });
                });

                it("rejects an invalid limit parameter", function () {
                    return expect(list({ limit: "foo" })).to.be.an.api.error(400, "invalid_limit");
                });
            });

            describe("with offset parameter", function () {
                it("defaults to an offset of 0", function () {
                    return list().then(function (defResponse) {
                        return list({ offset: 0 }).then(function (response) {
                            expect(response.body.success).to.equal(true);
                            expect(defResponse.body).to.deep.equal(response.body);
                        });
                    });
                });

                it("lets us specify a valid offset", function () {
                    return list().then(function (defResponse) {
                        return list({ offset: 5 }).then(function (response) {
                            expect(response.body.success).to.equal(true);
                            expect(response.body.count).to.equal(40);
                            expect(response.body.formularyEntries.length).to.equal(25);

                            var offsetResults = response.body.formularyEntries.slice(0, 20);
                            var defaultResults = defResponse.body.formularyEntries.slice(5);
                            expect(offsetResults).to.deep.equal(defaultResults);
                        });
                    });
                });

                it("lets us specify a valid offset that means less results are returned", function () {
                    return list().then(function (defResponse) {
                        return list({ offset: 20 }).then(function (response) {
                            expect(response.body.success).to.equal(true);
                            expect(response.body.count).to.equal(40);
                            expect(response.body.formularyEntries.length).to.equal(20);

                            var offsetResults = response.body.formularyEntries.slice(0, 5);
                            var defaultResults = defResponse.body.formularyEntries.slice(20);
                            expect(offsetResults).to.deep.equal(defaultResults);
                        });
                    });
                });

                it("lets us specify a valid offset that means no results are returned", function () {
                    return list({ offset: 45 }).then(function (response) {
                        expect(response.body.success).to.equal(true);
                        expect(response.body.count).to.equal(40);
                        expect(response.body.formularyEntries.length).to.equal(0);
                    });
                });
                it("lets us specify both an offset and limit parameter", function () {
                    return list().then(function (defResponse) {
                        return list({ offset: 5, limit: 5 }).then(function (response) {
                            expect(response.body.success).to.equal(true);
                            expect(response.body.count).to.equal(40);
                            expect(response.body.formularyEntries.length).to.equal(5);

                            var offsetResults = response.body.formularyEntries.slice(0, 5);
                            var defaultResults = defResponse.body.formularyEntries.slice(5, 10);
                            expect(offsetResults).to.deep.equal(defaultResults);
                        });
                    });
                });

                it("ignores a null offset", function () {
                    return list().then(function (defResponse) {
                        return list({ offset: null }).then(function (response) {
                            expect(response.body.success).to.equal(true);
                            expect(defResponse.body).to.deep.equal(response.body);
                        });
                    });
                });

                it("rejects an invalid offset parameter", function () {
                    return expect(list({ offset: "foo" })).to.be.an.api.error(400, "invalid_offset");
                });
            });

            describe("with sort_by parameter", function () {
                it("defaults to sorting by id", function () {
                    return list().then(function (response) {
                        expect(response.body.success).to.equal(true);

                        var sorted = response.body.formularyEntries.slice(0).sort(function (userA, userB) {
                            // string IDs
                            return userA.id.localeCompare(userB.id);
                        });
                        expect(response.body.formularyEntries).to.deep.equal(sorted);
                    });
                });

                it("allows sorting by id", function () {
                    return list({ sort_by: "id" }).then(function (response) {
                        expect(response.body.success).to.equal(true);

                        var sorted = response.body.formularyEntries.slice(0).sort(function (userA, userB) {
                            // string IDs
                            return userA.id.localeCompare(userB.id);
                        });
                        expect(response.body.formularyEntries).to.deep.equal(sorted);
                    });
                });

                it("ignores a null sort_by", function () {
                    return list({ sort_by: null }).then(function (response) {
                        expect(response.body.success).to.equal(true);

                        var sorted = response.body.formularyEntries.slice(0).sort(function (userA, userB) {
                            // string IDs
                            return userA.id.localeCompare(userB.id);
                        });
                        expect(response.body.formularyEntries).to.deep.equal(sorted);
                    });
                });

                it("rejects an invalid sort_by", function () {
                    return expect(list({ sort_by: "foo" })).to.be.an.api.error(400, "invalid_sort_by");
                });
            });

            describe("with sort_order parameter", function () {
                it("defaults to sorting in ascending order", function () {
                    return list().then(function (defResponse) {
                        return list({ sort_order: "asc" }).then(function (response) {
                        expect(response.body.success).to.equal(true);
                            expect(response.body).to.deep.equal(defResponse.body);
                        });
                    });
                });

                it("allows sorting in ascending order", function () {
                    return list({ sort_order: "asc" }).then(function (response) {
                        expect(response.body.success).to.equal(true);
                        var sorted = response.body.formularyEntries.slice(0).sort(function (userA, userB) {
                            // string IDs
                            return userA.id.localeCompare(userB.id);
                        });
                        expect(response.body.formularyEntries).to.deep.equal(sorted);
                    });
                });

                it("allows sorting in descending order", function () {
                    return list({ sort_order: "desc" }).then(function (response) {
                        expect(response.body.success).to.equal(true);
                        var sorted = response.body.formularyEntries.slice(0).sort(function (userA, userB) {
                            // string IDs
                            return userA.id.localeCompare(userB.id);
                        }).reverse();
                        expect(response.body.formularyEntries).to.deep.equal(sorted);
                    });
                });

                it("allows both sort_by and sort_order", function () {
                    return list({ sort_order: "desc", sort_by: "id" }).then(function (response) {
                        expect(response.body.success).to.equal(true);
                        var sorted = response.body.formularyEntries.slice(0).sort(function (userA, userB) {
                            // string IDs
                            return userA.id.localeCompare(userB.id);
                        }).reverse();
                        expect(response.body.formularyEntries).to.deep.equal(sorted);
                    });
                });

                it("ignores a null sort_order", function () {
                    return list().then(function (defResponse) {
                        return list({ sort_order: null }).then(function (response) {
                            expect(response.body.success).to.equal(true);
                            expect(response.body).to.deep.equal(defResponse.body);
                        });
                    });
                });

                it("rejects an invalid sort_order", function () {
                    return expect(list({
                        sort_order: "foo"
                    })).to.be.an.api.error(400, "invalid_sort_order");
                });
            });

            describe("with genericName parameter", function () {
                it("doesn't filter by genericName by default", function () {
                    return list().then(function (response) {
                        expect(response.body.success).to.equal(true);
                        expect(response.body.count).to.equal(40);
                    });
                });

                it("ignores a null genericName parameter", function () {
                    return list({ genericName: null }).then(function (response) {
                        expect(response.body.success).to.equal(true);
                        expect(response.body.count).to.equal(40);
                    });
                });

                it("handles no results", function () {
                    return list({ genericName: "notanamelikethis" }).then(function (response) {
                        expect(response.body.success).to.equal(true);
                        expect(response.body.count).to.equal(0);
                        expect(response.body.formularyEntries.length).to.equal(0);
                    });
                });

                it("handles searching substring", function () {
                    return list({ genericName: "matching" }).then(function (response) {
                        expect(response.body.success).to.equal(true);
                        expect(response.body.count).to.equal(1);
                        expect(response.body.formularyEntries.length).to.equal(1);
                        expect(response.body.formularyEntries[0].genericName).to.equal("test substring matching");
                    });
                });
            });

            describe("with vaClass parameter", function () {
                it("doesn't filter by vaClass by default", function () {
                    return list().then(function (response) {
                        expect(response.body.success).to.equal(true);
                        expect(response.body.count).to.equal(40);
                    });
                });

                it("ignores a null vaClass parameter", function () {
                    return list({ vaClass: null }).then(function (response) {
                        expect(response.body.success).to.equal(true);
                        expect(response.body.count).to.equal(40);
                    });
                });

                it("handles no results", function () {
                    return list({ vaClass: "notanamelikethis" }).then(function (response) {
                        expect(response.body.success).to.equal(true);
                        expect(response.body.count).to.equal(0);
                        expect(response.body.formularyEntries.length).to.equal(0);
                    });
                });

                it("handles searching exactly", function () {
                    return list({ vaClass: "YZ999" }).then(function (response) {
                        expect(response.body.success).to.equal(true);
                        expect(response.body.count).to.equal(1);
                        expect(response.body.formularyEntries.length).to.equal(1);
                        expect(response.body.formularyEntries[0].vaClass).to.equal("YZ999");
                    });
                });
            });
        });
    });
});
