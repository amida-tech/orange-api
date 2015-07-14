"use strict";
var chakram     = require("chakram"),
    Q           = require("q"),
    querystring = require("querystring"),
    util        = require("util"),
    auth        = require("../common/auth.js"),
    patients    = require("../patients/common.js");

var expect = chakram.expect;

describe("Patients", function () {
    describe("Listing All Shares (GET /patients/:patientid/shares)", function () {
        // setup test user and patient
        var patient;
        before(function () {
            return patients.testMyPatient({}).then(function (p) {
                patient = p;
            });
        });

        // endpoint to view all shares
        var list = function (patientId, accessToken, params) {
            if (typeof params === "undefined" || params === null) params = {};
            var query = querystring.stringify(params);

            var url = util.format("http://localhost:3000/v1/patients/%d/shares?%s", patientId, query);
            return chakram.get(url, auth.genAuthHeaders(accessToken));
        };
        var listPatient = function (p, params) {
            return list(p._id, p.user.accessToken, params);
        };
        var listAPatient = function (params) {
            return listPatient(patient, params);
        };

        // check it requires a valid and authenticated/authorized patient and user
        patients.itRequiresAuthentication(list);
        patients.itRequiresValidPatientId(list);
        patients.itRequiresReadAuthorization(listPatient);

        it("successfully returns shares", function () {
            return expect(listAPatient()).to.be.a.share.listSuccess;
        });

        it("initially shows an owner share", function () {
            return listAPatient().then(function (response) {
                expect(response.body.shares.length).to.equal(1);
                expect(response.body.shares[0].group).to.equal("owner");
            });
        });

        describe("sharing with an existing user", function () {
            // create a new user and share the patient with them
            before(function () {
                return auth.createTestUser({}).then(function (user) {
                    return Q.nbind(patient.share, patient)(user.email, "default", "prime");
                });
            });

            it("shows the new share", function () {
                return listAPatient().then(function (response) {
                    // filter shares to find those for existing users only, also removing
                    // the share showing who owns the patient
                    var shares = response.body.shares.filter(function (share) {
                        return share.is_user && share.group !== "owner";
                    });
                    expect(shares.length).to.equal(1);

                    // check properties were set correctly
                    expect(shares[0].group).to.equal("prime");
                    expect(shares[0].access).to.equal("default");
                });
            });
        });

        describe("sharing with a nonexistent user", function () {
            // share patient with an email address not corresponding to an existing
            // patient
            before(function () {
                return Q.nbind(patient.share, patient)("email.not@auser.com", "write", "anyone");
            });

            it("shows the new share", function () {
                return listAPatient().then(function (response) {
                    // filter shares to find those for nonexistent users only
                    // (this also filters out the owner share for us)
                    var shares = response.body.shares.filter(function (share) {
                        return !share.is_user;
                    });
                    expect(shares.length).to.equal(1);

                    // check properties were set correctly
                    expect(shares[0].group).to.equal("anyone");
                    expect(shares[0].access).to.equal("write");
                });
            });
        });

        describe("with test shares set up", function () {
            // setup test user again, clearing previous shares
            before(function () {
                return patients.testMyPatient({}).then(function (p) {
                    patient = p;
                });
            });

            // share the patient with 39 other users (the owner share already exists,
            // so this brings the total number of shares to 40)
            before(function () {
                // generate promise to create each share
                var promises = [];
                // takes (email, access, group)
                var create = Q.nbind(patient.share, patient);

                // create 1 patient for a real user with write access in the prime group
                promises.push(function () {
                    return auth.createTestUser().then(function (u) {
                        return create(u.email, "write", "prime");
                    });
                });

                // create 38 patients for fake users with read access in the anyone group
                for (var i = 0; i < 38; i++) {
                    /*eslint-disable no-loop-func */
                    var promise = (function (index) {
                        return function () {
                            var email = util.format("foo%d@barsharing.com", index);
                            return create(email, "read", "anyone");
                        };
                    })(i);
                    promises.push(promise);
                    /*eslint-enable no-loop-func */
                }

                // run promises sequentially with reduce
                return promises.reduce(function (promise, f) {
                    return promise.then(f);
                }, Q());
            });

            it("returns a successful response", function () {
                return expect(listAPatient()).to.be.a.share.listSuccess;
            });

            it("returns the correct count", function () {
                return listAPatient().then(function (response) {
                    expect(response.body.count).to.equal(40);
                });
            });

            describe("with limit parameter", function () {
                it("limits results to 25 by default", function () {
                    return listAPatient().then(function (response) {
                        expect(response).to.be.a.share.listSuccess;
                        expect(response.body.shares.length).to.equal(25);
                        expect(response.body.count).to.equal(40);
                    });
                });

                it("lets us limit the results to less than 25", function () {
                    return listAPatient({ limit: 15 }).then(function (response) {
                        expect(response).to.be.a.share.listSuccess;
                        expect(response.body.shares.length).to.equal(15);
                        expect(response.body.count).to.equal(40);
                    });
                });

                it("lets us limit the results to between 25 and 40", function () {
                    return listAPatient({ limit: 30 }).then(function (response) {
                        expect(response).to.be.a.share.listSuccess;
                        expect(response.body.shares.length).to.equal(30);
                        expect(response.body.count).to.equal(40);
                    });
                });

                it("lets us limit the results to greater than 40, but caps at 40", function () {
                    return listAPatient({ limit: 50 }).then(function (response) {
                        expect(response).to.be.a.share.listSuccess;
                        expect(response.body.shares.length).to.equal(40);
                        expect(response.body.count).to.equal(40);
                    });
                });

                it("ignores a null limit parameter", function () {
                    return listAPatient({ limit: null }).then(function (response) {
                        expect(response).to.be.a.share.listSuccess;
                        expect(response.body.shares.length).to.equal(25);
                        expect(response.body.count).to.equal(40);
                    });
                });

                it("rejects an invalid limit parameter", function () {
                    return expect(listAPatient({ limit: "foo" })).to.be.an.api.error(400, "invalid_limit");
                });
            });

            describe("with offset parameter", function () {
                it("defaults to an offset of 0", function () {
                    return listAPatient().then(function (defResponse) {
                        return listAPatient({ offset: 0 }).then(function (response) {
                            expect(response).to.be.a.share.listSuccess;
                            expect(defResponse.body).to.deep.equal(response.body);
                        });
                    });
                });

                it("lets us specify a valid offset", function () {
                    return listAPatient().then(function (defResponse) {
                        return listAPatient({ offset: 5 }).then(function (response) {
                            expect(response).to.be.a.share.listSuccess;
                            expect(response.body.count).to.equal(40);
                            expect(response.body.shares.length).to.equal(25);

                            var offsetResults = response.body.shares.slice(0, 20);
                            var defaultResults = defResponse.body.shares.slice(5);
                            expect(offsetResults).to.deep.equal(defaultResults);
                        });
                    });
                });

                it("lets us specify a valid offset that means less results are returned", function () {
                    return listAPatient().then(function (defResponse) {
                        return listAPatient({ offset: 20 }).then(function (response) {
                            expect(response).to.be.a.share.listSuccess;
                            expect(response.body.count).to.equal(40);
                            expect(response.body.shares.length).to.equal(20);

                            var offsetResults = response.body.shares.slice(0, 5);
                            var defaultResults = defResponse.body.shares.slice(20);
                            expect(offsetResults).to.deep.equal(defaultResults);
                        });
                    });
                });

                it("lets us specify a valid offset that means no results are returned", function () {
                    return listAPatient({ offset: 45 }).then(function (response) {
                        expect(response).to.be.a.share.listSuccess;
                        expect(response.body.count).to.equal(40);
                        expect(response.body.shares.length).to.equal(0);
                    });
                });
                it("lets us specify both an offset and limit parameter", function () {
                    return listAPatient().then(function (defResponse) {
                        return listAPatient({ offset: 5, limit: 5 }).then(function (response) {
                            expect(response).to.be.a.share.listSuccess;
                            expect(response.body.count).to.equal(40);
                            expect(response.body.shares.length).to.equal(5);

                            var offsetResults = response.body.shares.slice(0, 5);
                            var defaultResults = defResponse.body.shares.slice(5, 10);
                            expect(offsetResults).to.deep.equal(defaultResults);
                        });
                    });
                });

                it("ignores a null offset", function () {
                    return listAPatient().then(function (defResponse) {
                        return listAPatient({ offset: null }).then(function (response) {
                            expect(response).to.be.a.share.listSuccess;
                            expect(defResponse.body).to.deep.equal(response.body);
                        });
                    });
                });

                it("rejects an invalid offset parameter", function () {
                    return expect(listAPatient({ offset: "foo" })).to.be.an.api.error(400, "invalid_offset");
                });
            });

            describe("with sort_by parameter", function () {
                it("defaults to sorting by id", function () {
                    return listAPatient().then(function (response) {
                        expect(response).to.be.a.share.listSuccess;

                        var sorted = response.body.shares.slice(0).sort(function (patientA, patientB) {
                            // numeric IDs
                            return patientA.id - patientB.id;
                        });
                        expect(response.body.shares).to.deep.equal(sorted);
                    });
                });

                it("allows sorting by id", function () {
                    return listAPatient({ sort_by: "id" }).then(function (response) {
                        expect(response).to.be.a.share.listSuccess;

                        var sorted = response.body.shares.slice(0).sort(function (patientA, patientB) {
                            // numeric IDs
                            return patientA.id - patientB.id;
                        });
                        expect(response.body.shares).to.deep.equal(sorted);
                    });
                });

                it("allows sorting by email", function () {
                    return listAPatient({ sort_by: "email" }).then(function (response) {
                        expect(response).to.be.a.share.listSuccess;

                        var sorted = response.body.shares.slice(0).sort(function (patientA, patientB) {
                            // string emails
                            return patientA.email.localeCompare(patientB.email);
                        });
                        expect(response.body.shares).to.deep.equal(sorted);
                    });
                });

                it("ignores a null sort_by", function () {
                    return listAPatient({ sort_by: null }).then(function (response) {
                        expect(response).to.be.a.share.listSuccess;

                        var sorted = response.body.shares.slice(0).sort(function (patientA, patientB) {
                            // numeric IDs
                            return patientA.id - patientB.id;
                        });
                        expect(response.body.shares).to.deep.equal(sorted);
                    });
                });

                it("rejects an invalid sort_by", function () {
                    return expect(listAPatient({ sort_by: "foo" })).to.be.an.api.error(400, "invalid_sort_by");
                });
            });

            describe("with sort_order parameter", function () {
                it("defaults to sorting in ascending order", function () {
                    return listAPatient().then(function (defResponse) {
                        return listAPatient({ sort_order: "asc" }).then(function (response) {
                            expect(response).to.be.a.share.listSuccess;
                            expect(response.body).to.deep.equal(defResponse.body);
                        });
                    });
                });

                it("allows sorting in ascending order", function () {
                    return listAPatient({ sort_order: "asc" }).then(function (response) {
                        expect(response).to.be.a.share.listSuccess;
                        var sorted = response.body.shares.slice(0).sort(function (patientA, patientB) {
                            // numeric IDs
                            return patientA.id - patientB.id;
                        });
                        expect(response.body.shares).to.deep.equal(sorted);
                    });
                });

                it("allows sorting in descending order", function () {
                    return listAPatient({ sort_order: "desc" }).then(function (response) {
                        expect(response).to.be.a.share.listSuccess;
                        var sorted = response.body.shares.slice(0).sort(function (patientA, patientB) {
                            // numeric IDs
                            return patientA.id - patientB.id;
                        }).reverse();
                        expect(response.body.shares).to.deep.equal(sorted);
                    });
                });

                it("allows both sort_by and sort_order", function () {
                    return listAPatient({ sort_order: "desc", sort_by: "email" }).then(function (response) {
                        expect(response).to.be.a.share.listSuccess;
                        var sorted = response.body.shares.slice(0).sort(function (patientA, patientB) {
                            // string emails
                            return patientA.email.localeCompare(patientB.email);
                        }).reverse();
                        expect(response.body.shares).to.deep.equal(sorted);
                    });
                });

                it("ignores a null sort_order", function () {
                    return listAPatient().then(function (defResponse) {
                        return listAPatient({ sort_order: null }).then(function (response) {
                            expect(response).to.be.a.share.listSuccess;
                            expect(response.body).to.deep.equal(defResponse.body);
                        });
                    });
                });

                it("rejects an invalid sort_order", function () {
                    return expect(listAPatient({
                        sort_order: "foo"
                    })).to.be.an.api.error(400, "invalid_sort_order");
                });
            });

            describe("with is_user parameter", function () {
                it("shows all by default", function () {
                    return listAPatient().then(function (response) {
                        expect(response).to.be.a.share.listSuccess;
                        expect(response.body.count).to.equal(40);
                    });
                });

                it("ignores null", function () {
                    return listAPatient({ is_user: null }).then(function (response) {
                        expect(response).to.be.a.share.listSuccess;
                        expect(response.body.count).to.equal(40);
                    });
                });

                it("accepts true", function () {
                    return listAPatient({ is_user: true }).then(function (response) {
                        expect(response).to.be.a.share.listSuccess;
                        // custom-created share and owner share
                        expect(response.body.count).to.equal(2);
                    });
                });

                it("accepts false", function () {
                    return listAPatient({ is_user: false }).then(function (response) {
                        expect(response).to.be.a.share.listSuccess;
                        // everything except custom-created share and owner share
                        expect(response.body.count).to.equal(38);
                    });
                });

                it("rejects an invalid value", function () {
                    return expect(listAPatient({ is_user: "foo" })).to.be.an.api.error(400, "invalid_is_user");
                });
            });

            describe("with group parameter", function () {
                it("shows all by default", function () {
                    return listAPatient().then(function (response) {
                        expect(response).to.be.a.share.listSuccess;
                        expect(response.body.count).to.equal(40);
                    });
                });

                it("ignores null", function () {
                    return listAPatient({ group: null }).then(function (response) {
                        expect(response).to.be.a.share.listSuccess;
                        expect(response.body.count).to.equal(40);
                    });
                });

                it("accepts owner", function () {
                    return listAPatient({ group: "owner" }).then(function (response) {
                        expect(response).to.be.a.share.listSuccess;
                        // just owner share
                        expect(response.body.count).to.equal(1);
                    });
                });

                it("accepts prime", function () {
                    return listAPatient({ group: "prime" }).then(function (response) {
                        expect(response).to.be.a.share.listSuccess;
                        // just custom created share
                        expect(response.body.count).to.equal(1);
                    });
                });

                it("accepts family", function () {
                    return listAPatient({ group: "family" }).then(function (response) {
                        expect(response).to.be.a.share.listSuccess;
                        // no shares
                        expect(response.body.count).to.equal(0);
                    });
                });

                it("accepts anyone", function () {
                    return listAPatient({ group: "anyone" }).then(function (response) {
                        expect(response).to.be.a.share.listSuccess;
                        // all shares apart from owner share and custom-created share
                        expect(response.body.count).to.equal(38);
                    });
                });

                it("rejects an invalid value", function () {
                    return expect(listAPatient({ group: "foo" })).to.be.an.api.error(400, "invalid_group");
                });
            });

            describe("with access parameter", function () {
                it("shows all by default", function () {
                    return listAPatient().then(function (response) {
                        expect(response).to.be.a.share.listSuccess;
                        expect(response.body.count).to.equal(40);
                    });
                });

                it("ignores null", function () {
                    return listAPatient({ access: null }).then(function (response) {
                        expect(response).to.be.a.share.listSuccess;
                        expect(response.body.count).to.equal(40);
                    });
                });

                it("accepts read", function () {
                    return listAPatient({ access: "read" }).then(function (response) {
                        expect(response).to.be.a.share.listSuccess;
                        // all except owner share and custom created share
                        expect(response.body.count).to.equal(38);
                    });
                });

                it("accepts write", function () {
                    return listAPatient({ access: "write" }).then(function (response) {
                        expect(response).to.be.a.share.listSuccess;
                        // owner share and custom created share
                        expect(response.body.count).to.equal(2);
                    });
                });

                it("rejects an invalid value", function () {
                    return expect(listAPatient({ access: "foo" })).to.be.an.api.error(400, "invalid_access");
                });
            });

            describe("with email parameter", function () {
                it("doesn't filter by email by default", function () {
                    return listAPatient().then(function (response) {
                        expect(response).to.be.a.share.listSuccess;
                        expect(response.body.count).to.equal(40);
                    });
                });

                it("ignores a null email parameter", function () {
                    return listAPatient({ email: null }).then(function (response) {
                        expect(response).to.be.a.share.listSuccess;
                        expect(response.body.count).to.equal(40);
                    });
                });

                it("handles no results", function () {
                    return listAPatient({ email: "notanemaillikethis" }).then(function (response) {
                        expect(response).to.be.a.share.listSuccess;
                        expect(response.body.count).to.equal(0);
                        expect(response.body.shares.length).to.equal(0);
                    });
                });

                it("handles searching exactly", function () {
                    return listAPatient({ email: "foo1@barsharing.com" }).then(function (response) {
                        expect(response).to.be.a.share.listSuccess;
                        expect(response.body.count).to.equal(1);
                        expect(response.body.shares.length).to.equal(1);
                        expect(response.body.shares[0].email).to.equal("foo1@barsharing.com");
                    });
                });

                it("doesn't search fuzzily", function () {
                    return listAPatient({ email: "foo1@barsharing.co" }).then(function (response) {
                        expect(response).to.be.a.share.listSuccess;
                        expect(response.body.count).to.equal(0);
                        expect(response.body.shares.length).to.equal(0);
                    });
                });
            });
        });
    });
});
