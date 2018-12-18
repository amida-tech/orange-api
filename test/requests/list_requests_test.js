"use strict";
var chakram     = require("chakram"),
    curry       = require("curry"),
    Q           = require("q"),
    util        = require("util"),
    querystring = require("querystring"),
    auth        = require("../common/auth.js");

var expect = chakram.expect;

describe("Requests", function () {
    describe("List Requests made to the Current User", function () {
        // list all requests made to a user
        var listRequests = module.exports.listRequests = function (parameters, accessToken) {
            if (typeof parameters === "undefined" || parameters === null) parameters = {};
            var query = querystring.stringify(parameters);
            var url = util.format("http://localhost:5000/v1/requests?%s", query);
            return chakram.get(url, auth.genAuthHeaders(accessToken));
        };
        var listUser = function (user, parameters) {
            return listRequests(parameters, user.accessToken);
        };

        // check it requires authentication
        auth.itRequiresAuthentication(curry(listRequests)({}));

        describe("with test requests set up", function () {
            // setup test user
            var me;
            before(function () {
                return auth.createTestUser(undefined, true).then(function (u) {
                    me = u;
                });
            });

            // setup 40 different users, each with a request *to* 'me'
            before(function () {
                // generate promise to create each user and request
                var promises = [];
                var create = function (data) {
                    return auth.createTestUser(data, true).then(function (u) {
                        return Q.npost(u, "makeRequest", [me.email]);
                    });
                };
                // create 1 user & request with a custom email address
                promises.push(function () {
                    return create({
                        email: "another.test.email@for.matching.com"
                    });
                });
                // create 39 users & requests with default data
                for (var i = 0; i < 39; i++) {
                    /*eslint-disable no-loop-func */
                    promises.push(function () {
                        return create({});
                    });
                    /*eslint-enable no-loop-func */
                }

                // run promises sequentially with reduce
                return promises.reduce(function (promise, f) {
                    return promise.then(f);
                }, Q());
            });

            it("returns a successful response", function () {
                return expect(listUser(me)).to.be.a.requests.listSuccess;
            });

            it("returns the correct count", function () {
                return listUser(me).then(function (response) {
                    expect(response.body.count).to.equal(40);
                });
            });

            describe("with limit parameter", function () {
                it("limits results to 25 by default", function () {
                    return listUser(me).then(function (response) {
                        expect(response).to.be.a.requests.listSuccess;
                        expect(response.body.requests.length).to.equal(25);
                        expect(response.body.count).to.equal(40);
                    });
                });

                it("lets us limit the results to less than 25", function () {
                    return listUser(me, { limit: 15 }).then(function (response) {
                        expect(response).to.be.a.requests.listSuccess;
                        expect(response.body.requests.length).to.equal(15);
                        expect(response.body.count).to.equal(40);
                    });
                });

                it("lets us limit the results to between 25 and 40", function () {
                    return listUser(me, { limit: 30 }).then(function (response) {
                        expect(response).to.be.a.requests.listSuccess;
                        expect(response.body.requests.length).to.equal(30);
                        expect(response.body.count).to.equal(40);
                    });
                });

                it("lets us limit the results to greater than 40, but caps at 40", function () {
                    return listUser(me, { limit: 50 }).then(function (response) {
                        expect(response).to.be.a.requests.listSuccess;
                        expect(response.body.requests.length).to.equal(40);
                        expect(response.body.count).to.equal(40);
                    });
                });

                it("ignores a null limit parameter", function () {
                    return listUser(me, { limit: null }).then(function (response) {
                        expect(response).to.be.a.requests.listSuccess;
                        expect(response.body.requests.length).to.equal(25);
                        expect(response.body.count).to.equal(40);
                    });
                });

                it("allows a zero limit parameter to return all results", function () {
                    return listUser(me, { limit: 0 }).then(function (response) {
                        expect(response).to.be.a.requests.listSuccess;
                        expect(response.body.requests.length).to.equal(40);
                        expect(response.body.count).to.equal(40);
                    });
                });

                it("rejects an invalid limit parameter", function () {
                    return expect(listUser(me, { limit: "foo" })).to.be.an.api.error(400, "invalid_limit");
                });
            });

            describe("with offset parameter", function () {
                it("defaults to an offset of 0", function () {
                    return listUser(me).then(function (defResponse) {
                        return listUser(me, { offset: 0 }).then(function (response) {
                            expect(response).to.be.a.requests.listSuccess;
                            expect(defResponse.body).to.deep.equal(response.body);
                        });
                    });
                });

                it("lets us specify a valid offset", function () {
                    return listUser(me).then(function (defResponse) {
                        return listUser(me, { offset: 5 }).then(function (response) {
                            expect(response).to.be.a.requests.listSuccess;
                            expect(response.body.count).to.equal(40);
                            expect(response.body.requests.length).to.equal(25);
                            var offsetResults = response.body.requests.slice(0, 20);
                            var defaultResults = defResponse.body.requests.slice(5);
                            expect(offsetResults).to.deep.equal(defaultResults);
                        });
                    });
                });

                it("lets us specify a valid offset that means less results are returned", function () {
                    return listUser(me).then(function (defResponse) {
                        return listUser(me, { offset: 20 }).then(function (response) {
                            expect(response).to.be.a.requests.listSuccess;
                            expect(response.body.count).to.equal(40);
                            expect(response.body.requests.length).to.equal(20);
                            var offsetResults = response.body.requests.slice(0, 5);
                            var defaultResults = defResponse.body.requests.slice(20);
                            expect(offsetResults).to.deep.equal(defaultResults);
                        });
                    });
                });

                it("lets us specify a valid offset that means no results are returned", function () {
                    return listUser(me, { offset: 45 }).then(function (response) {
                        expect(response).to.be.a.requests.listSuccess;
                        expect(response.body.count).to.equal(40);
                        expect(response.body.requests.length).to.equal(0);
                    });
                });
                it("lets us specify both an offset and limit parameter", function () {
                    return listUser(me).then(function (defResponse) {
                        return listUser(me, { offset: 5, limit: 5 }).then(function (response) {
                            expect(response).to.be.a.requests.listSuccess;
                            expect(response.body.count).to.equal(40);
                            expect(response.body.requests.length).to.equal(5);
                            var offsetResults = response.body.requests.slice(0, 5);
                            var defaultResults = defResponse.body.requests.slice(5, 10);
                            expect(offsetResults).to.deep.equal(defaultResults);
                        });
                    });
                });

                it("ignores a null offset", function () {
                    return listUser(me).then(function (defResponse) {
                        return listUser(me, { offset: null }).then(function (response) {
                            expect(response).to.be.a.requests.listSuccess;
                            expect(defResponse.body).to.deep.equal(response.body);
                        });
                    });
                });

                it("rejects an invalid offset parameter", function () {
                    return expect(listUser(me, { offset: "foo" })).to.be.an.api.error(400, "invalid_offset");
                });
            });

            describe("with sort_by parameter", function () {
                it("defaults to sorting by id", function () {
                    return listUser(me).then(function (response) {
                        expect(response).to.be.a.requests.listSuccess;

                        var sorted = response.body.requests.slice(0).sort(function (requestA, requestB) {
                            // numeric IDs
                            return requestA.id - requestB.id;
                        });
                        expect(response.body.requests).to.deep.equal(sorted);
                    });
                });

                it("allows sorting by id", function () {
                    return listUser(me, { sort_by: "id" }).then(function (response) {
                        expect(response).to.be.a.requests.listSuccess;

                        var sorted = response.body.requests.slice(0).sort(function (requestA, requestB) {
                            // numeric IDs
                            return requestA.id - requestB.id;
                        });
                        expect(response.body.requests).to.deep.equal(sorted);
                    });
                });

                it("allows sorting by email", function () {
                    return listUser(me, { sort_by: "email" }).then(function (response) {
                        expect(response).to.be.a.requests.listSuccess;

                        var sorted = response.body.requests.slice(0).sort(function (requestA, requestB) {
                            // string emails
                            return requestA.email.localeCompare(requestB.email);
                        });
                        expect(response.body.requests).to.deep.equal(sorted);
                    });
                });

                it("ignores a null sort_by", function () {
                    return listUser(me, { sort_by: null }).then(function (response) {
                        expect(response).to.be.a.requests.listSuccess;

                        var sorted = response.body.requests.slice(0).sort(function (requestA, requestB) {
                            // numeric IDs
                            return requestA.id - requestB.id;
                        });
                        expect(response.body.requests).to.deep.equal(sorted);
                    });
                });

                it("rejects an invalid sort_by", function () {
                    return expect(listUser(me, { sort_by: "foo" })).to.be.an.api.error(400, "invalid_sort_by");
                });
            });

            describe("with sort_order parameter", function () {
                it("defaults to sorting in ascending order", function () {
                    return listUser(me).then(function (defResponse) {
                        return listUser(me, { sort_order: "asc" }).then(function (response) {
                            expect(response).to.be.a.requests.listSuccess;
                            expect(response.body).to.deep.equal(defResponse.body);
                        });
                    });
                });

                it("allows sorting in ascending order", function () {
                    return listUser(me, { sort_order: "asc" }).then(function (response) {
                        expect(response).to.be.a.requests.listSuccess;
                        var sorted = response.body.requests.slice(0).sort(function (requestA, requestB) {
                            // numeric IDs
                            return requestA.id - requestB.id;
                        });
                        expect(response.body.requests).to.deep.equal(sorted);
                    });
                });

                it("allows sorting in descending order", function () {
                    return listUser(me, { sort_order: "desc" }).then(function (response) {
                        expect(response).to.be.a.requests.listSuccess;
                        var sorted = response.body.requests.slice(0).sort(function (requestA, requestB) {
                            // numeric IDs
                            return requestA.id - requestB.id;
                        }).reverse();
                        expect(response.body.requests).to.deep.equal(sorted);
                    });
                });

                it("allows both sort_by and sort_order", function () {
                    return listUser(me, { sort_order: "desc", sort_by: "email" }).then(function (response) {
                        expect(response).to.be.a.requests.listSuccess;
                        var sorted = response.body.requests.slice(0).sort(function (requestA, requestB) {
                            // string emails
                            return requestA.email.localeCompare(requestB.email);
                        }).reverse();
                        expect(response.body.requests).to.deep.equal(sorted);
                    });
                });

                it("ignores a null sort_order", function () {
                    return listUser(me).then(function (defResponse) {
                        return listUser(me, { sort_order: null }).then(function (response) {
                            expect(response).to.be.a.requests.listSuccess;
                            expect(response.body).to.deep.equal(defResponse.body);
                        });
                    });
                });

                it("rejects an invalid sort_order", function () {
                    return expect(listUser(me, {
                        sort_order: "foo"
                    })).to.be.an.api.error(400, "invalid_sort_order");
                });
            });

            describe("with email parameter", function () {
                it("doesn't filter by email by default", function () {
                    return listUser(me).then(function (response) {
                        expect(response).to.be.a.requests.listSuccess;
                        expect(response.body.count).to.equal(40);
                    });
                });

                it("ignores a null email parameter", function () {
                    return listUser(me, { email: null }).then(function (response) {
                        expect(response).to.be.a.requests.listSuccess;
                        expect(response.body.count).to.equal(40);
                    });
                });

                it("handles no results", function () {
                    return listUser(me, { email: "notaemaillikethis" }).then(function (response) {
                        expect(response).to.be.a.requests.listSuccess;
                        expect(response.body.count).to.equal(0);
                        expect(response.body.requests.length).to.equal(0);
                    });
                });

                it("handles searching exactly", function () {
                    return listUser(me, { email: "another.test.email@for.matching.com" }).then(function (response) {
                        expect(response).to.be.a.requests.listSuccess;
                        expect(response.body.count).to.equal(1);
                        expect(response.body.requests.length).to.equal(1);
                        expect(response.body.requests[0].email).to.equal("another.test.email@for.matching.com");
                    });
                });

                it("handles searching by substrings", function () {
                    return listUser(me, { email: "for.matching.com" }).then(function (response) {
                        expect(response).to.be.a.requests.listSuccess;
                        expect(response.body.count).to.equal(1);
                        expect(response.body.requests.length).to.equal(1);
                        expect(response.body.requests[0].email).to.equal("another.test.email@for.matching.com");
                    });
                });

                it("doesn't search fuzzily", function () {
                    return listUser(me, { email: "for.mtching.com" }).then(function (response) {
                        expect(response).to.be.a.requests.listSuccess;
                        expect(response.body.count).to.equal(0);
                        expect(response.body.requests.length).to.equal(0);
                    });
                });
            });

            describe("with status parameter", function () {
                it("doesn't filter by status by default", function () {
                    return listUser(me).then(function (response) {
                        expect(response).to.be.a.requests.listSuccess;
                        expect(response.body.count).to.equal(40);
                    });
                });

                it("ignores a null status parameter", function () {
                    return listUser(me, { status: null }).then(function (response) {
                        expect(response).to.be.a.requests.listSuccess;
                        expect(response.body.count).to.equal(40);
                    });
                });

                it("handles no results", function () {
                    return listUser(me, { status: "accepted" }).then(function (response) {
                        expect(response).to.be.a.requests.listSuccess;
                        expect(response.body.count).to.equal(0);
                        expect(response.body.requests.length).to.equal(0);
                    });
                });

                it("handles searching exactly", function () {
                    return listUser(me, { status: "pending" }).then(function (response) {
                        expect(response).to.be.a.requests.listSuccess;
                        expect(response.body.count).to.equal(40);
                        expect(response.body.requests.length).to.equal(25);
                    });
                });

                it("rejects invalid status value", function () {
                    return listUser(me, { status: "foobar" }).then(function (response) {
                        expect(response).to.be.an.api.error(400, "invalid_status");
                    });
                });
            });
        });
    });
});
