"use strict";
var chakram         = require("chakram"),
    util            = require("util"),
    Q               = require("q"),
    querystring     = require("querystring"),
    auth            = require("../common/auth.js"),
    patients        = require("../patients/common.js"),
    fixtures        = require("./fixtures.js");

var expect = chakram.expect;

describe("Pharmacies", function () {
    describe("List Pharmacies (GET /patients/:patientid/pharmacies)", function () {
        // basic endpoint
        var list = function (patientId, accessToken, parameters) {
            if (typeof parameters === "undefined" || parameters === null) parameters = {};
            var query = querystring.stringify(parameters);

            var url = util.format("http://localhost:5000/v1/patients/%d/pharmacies?%s", patientId, query);
            return chakram.get(url, auth.genAuthHeaders(accessToken));
        };
        var listPatient = function (patient, parameters) {
            return list(patient._id, patient.user.accessToken, parameters);
        };

        // check permissions
        // check an authenticated user is required
        patients.itRequiresAuthentication(list);
        // check a valid patient is required
        patients.itRequiresValidPatientId(list);
        // check it requires read access to the pharmacy
        patients.itRequiresReadAuthorization(listPatient);

        describe("with test pharmacies set up", function () {
            // setup two patients
            var patient, otherPatient;
            before(function () {
                return auth.createTestUser(undefined, true).then(function (user) {
                    return patients.createMyPatient({}, user).then(function (p) {
                        patient = p;
                        return patients.createMyPatient({}, user).then(function (p) {
                            otherPatient = p;
                        });
                    });
                });
            });

            // setup a pharmacy for otherPatient
            before(function () {
                var create = Q.nbind(otherPatient.createPharmacy, otherPatient);
                return fixtures.build("Pharmacy", {}).then(create);
            });

            // setup 40 pharmacies for patient
            before(function () {
                // generate promise to create each pharmacy
                var promises = [];
                var create = Q.nbind(patient.createPharmacy, patient);
                // create 1 pharmacy with a custom name
                promises.push(function () {
                    return fixtures.build("Pharmacy", { name: "test fuzzy matching" }).then(create);
                });
                // create 39 pharmacies with default data
                for (var i = 0; i < 39; i++) {
                    /*eslint-disable no-loop-func */
                    var promise = function () {
                        return fixtures.build("Pharmacy", {}).then(create);
                    };
                    /*eslint-enable no-loop-func */
                    promises.push(promise);
                }

                // run promises sequentially with reduce
                return promises.reduce(function (promise, f) {
                    return promise.then(f);
                }, Q());
            });

            it("returns a successful response", function () {
                return expect(listPatient(patient)).to.be.a.pharmacy.listSuccess;
            });

            it("returns the correct count", function () {
                return listPatient(patient).then(function (response) {
                    expect(response.body.count).to.equal(40);
                });
            });

            describe("with limit parameter", function () {
                it("limits results to 25 by default", function () {
                    return listPatient(patient).then(function (response) {
                        expect(response).to.be.a.pharmacy.listSuccess;
                        expect(response.body.pharmacies.length).to.equal(25);
                        expect(response.body.count).to.equal(40);
                    });
                });

                it("lets us limit the results to less than 25", function () {
                    return listPatient(patient, { limit: 15 }).then(function (response) {
                        expect(response).to.be.a.pharmacy.listSuccess;
                        expect(response.body.pharmacies.length).to.equal(15);
                        expect(response.body.count).to.equal(40);
                    });
                });

                it("lets us limit the results to between 25 and 40", function () {
                    return listPatient(patient, { limit: 30 }).then(function (response) {
                        expect(response).to.be.a.pharmacy.listSuccess;
                        expect(response.body.pharmacies.length).to.equal(30);
                        expect(response.body.count).to.equal(40);
                    });
                });

                // this also guarantees that only results for the correct patient are returned
                // (otherwise it would return a maximum of 41 pharmacies, rather than 40)
                it("lets us limit the results to greater than 40, but caps at 40", function () {
                    return listPatient(patient, { limit: 50 }).then(function (response) {
                        expect(response).to.be.a.pharmacy.listSuccess;
                        expect(response.body.pharmacies.length).to.equal(40);
                        expect(response.body.count).to.equal(40);
                    });
                });

                it("ignores a null limit parameter", function () {
                    return listPatient(patient, { limit: null }).then(function (response) {
                        expect(response).to.be.a.pharmacy.listSuccess;
                        expect(response.body.pharmacies.length).to.equal(25);
                        expect(response.body.count).to.equal(40);
                    });
                });

                it("allows a zero limit parameter to return all results", function () {
                    return listPatient(patient, { limit: 0 }).then(function (response) {
                        expect(response).to.be.a.pharmacy.listSuccess;
                        expect(response.body.pharmacies.length).to.equal(40);
                        expect(response.body.count).to.equal(40);
                    });
                });

                it("rejects an invalid limit parameter", function () {
                    return expect(listPatient(patient, { limit: "foo" })).to.be.an.api.error(400, "invalid_limit");
                });
            });

            describe("with offset parameter", function () {
                it("defaults to an offset of 0", function () {
                    return listPatient(patient).then(function (defResponse) {
                        return listPatient(patient, { offset: 0 }).then(function (response) {
                            expect(response).to.be.a.pharmacy.listSuccess;
                            expect(defResponse.body).to.deep.equal(response.body);
                        });
                    });
                });

                it("lets us specify a valid offset", function () {
                    return listPatient(patient).then(function (defResponse) {
                        return listPatient(patient, { offset: 5 }).then(function (response) {
                            expect(response).to.be.a.pharmacy.listSuccess;
                            expect(response.body.count).to.equal(40);
                            expect(response.body.pharmacies.length).to.equal(25);

                            var offsetResults = response.body.pharmacies.slice(0, 20);
                            var defaultResults = defResponse.body.pharmacies.slice(5);
                            expect(offsetResults).to.deep.equal(defaultResults);
                        });
                    });
                });

                it("lets us specify a valid offset that means less results are returned", function () {
                    return listPatient(patient).then(function (defResponse) {
                        return listPatient(patient, { offset: 20 }).then(function (response) {
                            expect(response).to.be.a.pharmacy.listSuccess;
                            expect(response.body.count).to.equal(40);
                            expect(response.body.pharmacies.length).to.equal(20);

                            var offsetResults = response.body.pharmacies.slice(0, 5);
                            var defaultResults = defResponse.body.pharmacies.slice(20);
                            expect(offsetResults).to.deep.equal(defaultResults);
                        });
                    });
                });

                it("lets us specify a valid offset that means no results are returned", function () {
                    return listPatient(patient, { offset: 45 }).then(function (response) {
                        expect(response).to.be.a.pharmacy.listSuccess;
                        expect(response.body.count).to.equal(40);
                        expect(response.body.pharmacies.length).to.equal(0);
                    });
                });
                it("lets us specify both an offset and limit parameter", function () {
                    return listPatient(patient).then(function (defResponse) {
                        return listPatient(patient, { offset: 5, limit: 5 }).then(function (response) {
                            expect(response).to.be.a.pharmacy.listSuccess;
                            expect(response.body.count).to.equal(40);
                            expect(response.body.pharmacies.length).to.equal(5);

                            var offsetResults = response.body.pharmacies.slice(0, 5);
                            var defaultResults = defResponse.body.pharmacies.slice(5, 10);
                            expect(offsetResults).to.deep.equal(defaultResults);
                        });
                    });
                });

                it("ignores a null offset", function () {
                    return listPatient(patient).then(function (defResponse) {
                        return listPatient(patient, { offset: null }).then(function (response) {
                            expect(response).to.be.a.pharmacy.listSuccess;
                            expect(defResponse.body).to.deep.equal(response.body);
                        });
                    });
                });

                it("rejects an invalid offset parameter", function () {
                    return expect(listPatient(patient, { offset: "foo" })).to.be.an.api.error(400, "invalid_offset");
                });
            });

            describe("with sort_by parameter", function () {
                it("defaults to sorting by id", function () {
                    return listPatient(patient).then(function (response) {
                        expect(response).to.be.a.pharmacy.listSuccess;

                        var sorted = response.body.pharmacies.slice(0).sort(function (pharmacyA, pharmacyB) {
                            // numeric IDs
                            return pharmacyA.id - pharmacyB.id;
                        });
                        expect(response.body.pharmacies).to.deep.equal(sorted);
                    });
                });

                it("allows sorting by id", function () {
                    return listPatient(patient, { sort_by: "id" }).then(function (response) {
                        expect(response).to.be.a.pharmacy.listSuccess;

                        var sorted = response.body.pharmacies.slice(0).sort(function (pharmacyA, pharmacyB) {
                            // numeric IDs
                            return pharmacyA.id - pharmacyB.id;
                        });
                        expect(response.body.pharmacies).to.deep.equal(sorted);
                    });
                });

                it("allows sorting by name", function () {
                    return listPatient(patient, { sort_by: "name" }).then(function (response) {
                        expect(response).to.be.a.pharmacy.listSuccess;

                        var sorted = response.body.pharmacies.slice(0).sort(function (pharmacyA, pharmacyB) {
                            // string names
                            return pharmacyA.name.localeCompare(pharmacyB.name);
                        });
                        expect(response.body.pharmacies).to.deep.equal(sorted);
                    });
                });

                it("ignores a null sort_by", function () {
                    return listPatient(patient, { sort_by: null }).then(function (response) {
                        expect(response).to.be.a.pharmacy.listSuccess;

                        var sorted = response.body.pharmacies.slice(0).sort(function (pharmacyA, pharmacyB) {
                            // numeric IDs
                            return pharmacyA.id - pharmacyB.id;
                        });
                        expect(response.body.pharmacies).to.deep.equal(sorted);
                    });
                });

                it("rejects an invalid sort_by", function () {
                    return expect(listPatient(patient, { sort_by: "foo" })).to.be.an.api.error(400, "invalid_sort_by");
                });
            });

            describe("with sort_order parameter", function () {
                it("defaults to sorting in ascending order", function () {
                    return listPatient(patient).then(function (defResponse) {
                        return listPatient(patient, { sort_order: "asc" }).then(function (response) {
                            expect(response).to.be.a.pharmacy.listSuccess;
                            expect(response.body).to.deep.equal(defResponse.body);
                        });
                    });
                });

                it("allows sorting in ascending order", function () {
                    return listPatient(patient, { sort_order: "asc" }).then(function (response) {
                        expect(response).to.be.a.pharmacy.listSuccess;
                        var sorted = response.body.pharmacies.slice(0).sort(function (pharmacyA, pharmacyB) {
                            // numeric IDs
                            return pharmacyA.id - pharmacyB.id;
                        });
                        expect(response.body.pharmacies).to.deep.equal(sorted);
                    });
                });

                it("allows sorting in descending order", function () {
                    return listPatient(patient, { sort_order: "desc" }).then(function (response) {
                        expect(response).to.be.a.pharmacy.listSuccess;
                        var sorted = response.body.pharmacies.slice(0).sort(function (pharmacyA, pharmacyB) {
                            // numeric IDs
                            return pharmacyA.id - pharmacyB.id;
                        }).reverse();
                        expect(response.body.pharmacies).to.deep.equal(sorted);
                    });
                });

                it("allows both sort_by and sort_order", function () {
                    return listPatient(patient, { sort_order: "desc", sort_by: "name" }).then(function (response) {
                        expect(response).to.be.a.pharmacy.listSuccess;
                        var sorted = response.body.pharmacies.slice(0).sort(function (pharmacyA, pharmacyB) {
                            // string names
                            return pharmacyA.name.localeCompare(pharmacyB.name);
                        }).reverse();
                        expect(response.body.pharmacies).to.deep.equal(sorted);
                    });
                });

                it("ignores a null sort_order", function () {
                    return listPatient(patient).then(function (defResponse) {
                        return listPatient(patient, { sort_order: null }).then(function (response) {
                            expect(response).to.be.a.pharmacy.listSuccess;
                            expect(response.body).to.deep.equal(defResponse.body);
                        });
                    });
                });

                it("rejects an invalid sort_order", function () {
                    return expect(listPatient(patient, {
                        sort_order: "foo"
                    })).to.be.an.api.error(400, "invalid_sort_order");
                });
            });

            describe("with name parameter", function () {
                it("doesn't filter by name by default", function () {
                    return listPatient(patient).then(function (response) {
                        expect(response).to.be.a.pharmacy.listSuccess;
                        expect(response.body.count).to.equal(40);
                    });
                });

                it("ignores a null name parameter", function () {
                    return listPatient(patient, { name: null }).then(function (response) {
                        expect(response).to.be.a.pharmacy.listSuccess;
                        expect(response.body.count).to.equal(40);
                    });
                });

                it("handles no results", function () {
                    return listPatient(patient, { name: "notanamelikethis" }).then(function (response) {
                        expect(response).to.be.a.pharmacy.listSuccess;
                        expect(response.body.count).to.equal(0);
                        expect(response.body.pharmacies.length).to.equal(0);
                    });
                });

                it("handles searching exactly", function () {
                    return listPatient(patient, { name: "matching" }).then(function (response) {
                        expect(response).to.be.a.pharmacy.listSuccess;
                        expect(response.body.count).to.equal(1);
                        expect(response.body.pharmacies.length).to.equal(1);
                        expect(response.body.pharmacies[0].name).to.equal("test fuzzy matching");
                    });
                });

                it("handles searching fuzzily", function () {
                    return listPatient(patient, { name: "fzzy" }).then(function (response) {
                        expect(response).to.be.a.pharmacy.listSuccess;
                        expect(response.body.count).to.equal(1);
                        expect(response.body.pharmacies.length).to.equal(1);
                        expect(response.body.pharmacies[0].name).to.equal("test fuzzy matching");
                    });
                });
            });
        });
    });
});
