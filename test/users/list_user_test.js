"use strict";
var chakram         = require("chakram"),
    mongoose        = require("mongoose"),
    util            = require("util"),
    Q               = require("q"),
    querystring     = require("querystring"),
    auth            = require("../common/auth.js"),
    common          = require("./common.js"),
    fixtures        = require("./fixtures.js");

var User = mongoose.model("User");

var expect = chakram.expect;

describe("Users", function () {
    describe("List Users (GET /user/all)", function () {
        // basic endpoint
        var list = function (accessToken, parameters) {
            if (typeof parameters === "undefined" || parameters === null) parameters = {};
            var query = querystring.stringify(parameters);

            var url = util.format("http://localhost:5000/v1/user/all?%s", query);
            return chakram.get(url, auth.genAuthHeaders(accessToken));
        };
        var listUser = function (user, parameters) {
            return list(user.accessToken, parameters);
        };

        // check an authenticated user is required
        auth.itRequiresAuthentication(list);
        // TODO GAO test only programAdministrator can use this

        describe("with test users set up", function () {
            // setup test user
            var user;
            before(function () {
                return User.deleteMany({}).exec()
                .then(() => auth.createTestUser({
                    role: "programAdministrator"
                }))
                .then(function (u) {
                    user = u;
                });
            });

            // setup 39 users
            before(function () {
                // generate promise to create each user
                var promises = [];
                var create = function (data) {
                    return auth.createTestUser(data, true);
                };

                // create 1 user with a custom name
                promises.push(function () {
                    return create({
                        firstName: "test fuzzy matching",
                        lastName: "also a name"
                    });
                });
                // create 38 users with default data, to give a total of 40
                // (includes the initial user atient created)
                for (var i = 0; i < 38; i++) {
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
                return expect(listUser(user)).to.be.a.user.listSuccess;
            });

            it("returns the correct count", function () {
                return listUser(user).then(function (response) {
                    expect(response.body.count).to.equal(40);
                });
            });

            describe("with limit parameter", function () {
                it("limits results to 25 by default", function () {
                    return listUser(user).then(function (response) {
                        expect(response).to.be.a.user.listSuccess;
                        expect(response.body.users.length).to.equal(25);
                        expect(response.body.count).to.equal(40);
                    });
                });

                it("lets us limit the results to less than 25", function () {
                    return listUser(user, { limit: 15 }).then(function (response) {
                        expect(response).to.be.a.user.listSuccess;
                        expect(response.body.users.length).to.equal(15);
                        expect(response.body.count).to.equal(40);
                    });
                });

                it("lets us limit the results to between 25 and 40", function () {
                    return listUser(user, { limit: 30 }).then(function (response) {
                        expect(response).to.be.a.user.listSuccess;
                        expect(response.body.users.length).to.equal(30);
                        expect(response.body.count).to.equal(40);
                    });
                });

                it("lets us limit the results to greater than 40, but caps at 40", function () {
                    return listUser(user, { limit: 50 }).then(function (response) {
                        expect(response).to.be.a.user.listSuccess;
                        expect(response.body.users.length).to.equal(40);
                        expect(response.body.count).to.equal(40);
                    });
                });

                it("ignores a null limit parameter", function () {
                    return listUser(user, { limit: null }).then(function (response) {
                        expect(response).to.be.a.user.listSuccess;
                        expect(response.body.users.length).to.equal(25);
                        expect(response.body.count).to.equal(40);
                    });
                });

                it("allows a zero limit parameter to return all results", function () {
                    return listUser(user, { limit: 0 }).then(function (response) {
                        expect(response).to.be.a.user.listSuccess;
                        expect(response.body.users.length).to.equal(40);
                        expect(response.body.count).to.equal(40);
                    });
                });

                it("rejects an invalid limit parameter", function () {
                    return expect(listUser(user, { limit: "foo" })).to.be.an.api.error(400, "invalid_limit");
                });
            });

            describe("with offset parameter", function () {
                it("defaults to an offset of 0", function () {
                    return listUser(user).then(function (defResponse) {
                        return listUser(user, { offset: 0 }).then(function (response) {
                            expect(response).to.be.a.user.listSuccess;
                            expect(defResponse.body).to.deep.equal(response.body);
                        });
                    });
                });

                it("lets us specify a valid offset", function () {
                    return listUser(user).then(function (defResponse) {
                        return listUser(user, { offset: 5 }).then(function (response) {
                            expect(response).to.be.a.user.listSuccess;
                            expect(response.body.count).to.equal(40);
                            expect(response.body.users.length).to.equal(25);

                            var offsetResults = response.body.users.slice(0, 20);
                            var defaultResults = defResponse.body.users.slice(5);
                            expect(offsetResults).to.deep.equal(defaultResults);
                        });
                    });
                });

                it("lets us specify a valid offset that means less results are returned", function () {
                    return listUser(user).then(function (defResponse) {
                        return listUser(user, { offset: 20 }).then(function (response) {
                            expect(response).to.be.a.user.listSuccess;
                            expect(response.body.count).to.equal(40);
                            expect(response.body.users.length).to.equal(20);

                            var offsetResults = response.body.users.slice(0, 5);
                            var defaultResults = defResponse.body.users.slice(20);
                            expect(offsetResults).to.deep.equal(defaultResults);
                        });
                    });
                });

                it("lets us specify a valid offset that means no results are returned", function () {
                    return listUser(user, { offset: 45 }).then(function (response) {
                        expect(response).to.be.a.user.listSuccess;
                        expect(response.body.count).to.equal(40);
                        expect(response.body.users.length).to.equal(0);
                    });
                });
                it("lets us specify both an offset and limit parameter", function () {
                    return listUser(user).then(function (defResponse) {
                        return listUser(user, { offset: 5, limit: 5 }).then(function (response) {
                            expect(response).to.be.a.user.listSuccess;
                            expect(response.body.count).to.equal(40);
                            expect(response.body.users.length).to.equal(5);

                            var offsetResults = response.body.users.slice(0, 5);
                            var defaultResults = defResponse.body.users.slice(5, 10);
                            expect(offsetResults).to.deep.equal(defaultResults);
                        });
                    });
                });

                it("ignores a null offset", function () {
                    return listUser(user).then(function (defResponse) {
                        return listUser(user, { offset: null }).then(function (response) {
                            expect(response).to.be.a.user.listSuccess;
                            expect(defResponse.body).to.deep.equal(response.body);
                        });
                    });
                });

                it("rejects an invalid offset parameter", function () {
                    return expect(listUser(user, { offset: "foo" })).to.be.an.api.error(400, "invalid_offset");
                });
            });

            describe("with sort_by parameter", function () {
                it("defaults to sorting by id", function () {
                    return listUser(user).then(function (response) {
                        expect(response).to.be.a.user.listSuccess;

                        var sorted = response.body.users.slice(0).sort(function (userA, userB) {
                            // string IDs
                            return userA.id.localeCompare(userB.id);
                        });
                        expect(response.body.users).to.deep.equal(sorted);
                    });
                });

                it("allows sorting by id", function () {
                    return listUser(user, { sort_by: "id" }).then(function (response) {
                        expect(response).to.be.a.user.listSuccess;

                        var sorted = response.body.users.slice(0).sort(function (userA, userB) {
                            // string IDs
                            return userA.id.localeCompare(userB.id);
                        });
                        expect(response.body.users).to.deep.equal(sorted);
                    });
                });

                it("allows sorting by first name", function () {
                    return listUser(user, { sort_by: "first_name" }).then(function (response) {
                        expect(response).to.be.a.user.listSuccess;

                        var sorted = response.body.users.slice(0).sort(function (userA, userB) {
                            // string names
                            return userA.first_name.localeCompare(userB.first_name);
                        });
                        expect(response.body.users).to.deep.equal(sorted);
                    });
                });

                it("allows sorting by last name", function () {
                    return listUser(user, { sort_by: "last_name" }).then(function (response) {
                        expect(response).to.be.a.user.listSuccess;

                        var sorted = response.body.users.slice(0).sort(function (userA, userB) {
                            // string names
                            return userA.last_name.localeCompare(userB.last_name);
                        });
                        expect(response.body.users).to.deep.equal(sorted);
                    });
                });

                it("ignores a null sort_by", function () {
                    return listUser(user, { sort_by: null }).then(function (response) {
                        expect(response).to.be.a.user.listSuccess;

                        var sorted = response.body.users.slice(0).sort(function (userA, userB) {
                            // string IDs
                            return userA.id.localeCompare(userB.id);
                        });
                        expect(response.body.users).to.deep.equal(sorted);
                    });
                });

                it("rejects an invalid sort_by", function () {
                    return expect(listUser(user, { sort_by: "foo" })).to.be.an.api.error(400, "invalid_sort_by");
                });
            });

            describe("with sort_order parameter", function () {
                it("defaults to sorting in ascending order", function () {
                    return listUser(user).then(function (defResponse) {
                        return listUser(user, { sort_order: "asc" }).then(function (response) {
                            expect(response).to.be.a.user.listSuccess;
                            expect(response.body).to.deep.equal(defResponse.body);
                        });
                    });
                });

                it("allows sorting in ascending order", function () {
                    return listUser(user, { sort_order: "asc" }).then(function (response) {
                        expect(response).to.be.a.user.listSuccess;
                        var sorted = response.body.users.slice(0).sort(function (userA, userB) {
                            // string IDs
                            return userA.id.localeCompare(userB.id);
                        });
                        expect(response.body.users).to.deep.equal(sorted);
                    });
                });

                it("allows sorting in descending order", function () {
                    return listUser(user, { sort_order: "desc" }).then(function (response) {
                        expect(response).to.be.a.user.listSuccess;
                        var sorted = response.body.users.slice(0).sort(function (userA, userB) {
                            // string IDs
                            return userA.id.localeCompare(userB.id);
                        }).reverse();
                        expect(response.body.users).to.deep.equal(sorted);
                    });
                });

                it("allows both sort_by and sort_order", function () {
                    return listUser(user, { sort_order: "desc", sort_by: "first_name" }).then(function (response) {
                        expect(response).to.be.a.user.listSuccess;
                        var sorted = response.body.users.slice(0).sort(function (userA, userB) {
                            // string names
                            return userA.first_name.localeCompare(userB.first_name);
                        }).reverse();
                        expect(response.body.users).to.deep.equal(sorted);
                    });
                });

                it("ignores a null sort_order", function () {
                    return listUser(user).then(function (defResponse) {
                        return listUser(user, { sort_order: null }).then(function (response) {
                            expect(response).to.be.a.user.listSuccess;
                            expect(response.body).to.deep.equal(defResponse.body);
                        });
                    });
                });

                it("rejects an invalid sort_order", function () {
                    return expect(listUser(user, {
                        sort_order: "foo"
                    })).to.be.an.api.error(400, "invalid_sort_order");
                });
            });

            describe("with first_name parameter", function () {
                it("doesn't filter by first_name by default", function () {
                    return listUser(user).then(function (response) {
                        expect(response).to.be.a.user.listSuccess;
                        expect(response.body.count).to.equal(40);
                    });
                });

                it("ignores a null first_name parameter", function () {
                    return listUser(user, { first_name: null }).then(function (response) {
                        expect(response).to.be.a.user.listSuccess;
                        expect(response.body.count).to.equal(40);
                    });
                });

                it("handles no results", function () {
                    return listUser(user, { first_name: "notanamelikethis" }).then(function (response) {
                        expect(response).to.be.a.user.listSuccess;
                        expect(response.body.count).to.equal(0);
                        expect(response.body.users.length).to.equal(0);
                    });
                });

                it("handles searching exactly", function () {
                    return listUser(user, { first_name: "matching" }).then(function (response) {
                        expect(response).to.be.a.user.listSuccess;
                        expect(response.body.count).to.equal(1);
                        expect(response.body.users.length).to.equal(1);
                        expect(response.body.users[0].first_name).to.equal("test fuzzy matching");
                    });
                });

                it("handles searching fuzzily", function () {
                    return listUser(user, { first_name: "fzzy" }).then(function (response) {
                        expect(response).to.be.a.user.listSuccess;
                        expect(response.body.count).to.equal(1);
                        expect(response.body.users.length).to.equal(1);
                        expect(response.body.users[0].first_name).to.equal("test fuzzy matching");
                    });
                });
            });

            describe("with last_name parameter", function () {
                it("doesn't filter by last_name by default", function () {
                    return listUser(user).then(function (response) {
                        expect(response).to.be.a.user.listSuccess;
                        expect(response.body.count).to.equal(40);
                    });
                });

                it("ignores a null last_name parameter", function () {
                    return listUser(user, { last_name: null }).then(function (response) {
                        expect(response).to.be.a.user.listSuccess;
                        expect(response.body.count).to.equal(40);
                    });
                });

                it("handles no results", function () {
                    return listUser(user, { last_name: "notanamelikethis" }).then(function (response) {
                        expect(response).to.be.a.user.listSuccess;
                        expect(response.body.count).to.equal(0);
                        expect(response.body.users.length).to.equal(0);
                    });
                });

                it("handles searching exactly", function () {
                    return listUser(user, { last_name: "also a name" }).then(function (response) {
                        expect(response).to.be.a.user.listSuccess;
                        expect(response.body.count).to.equal(1);
                        expect(response.body.users.length).to.equal(1);
                        expect(response.body.users[0].last_name).to.equal("also a name");
                    });
                });

                it("handles searching fuzzily", function () {
                    return listUser(user, { last_name: "nme" }).then(function (response) {
                        expect(response).to.be.a.user.listSuccess;
                        expect(response.body.count).to.equal(1);
                        expect(response.body.users.length).to.equal(1);
                        expect(response.body.users[0].last_name).to.equal("also a name");
                    });
                });
            });
        });
    });
});
