"use strict";
var chakram         = require("chakram"),
    util            = require("util"),
    Q               = require("q"),
    querystring     = require("querystring"),
    auth            = require("../common/auth.js"),
    patients        = require("../patients/common.js"),
    fixtures        = require("./fixtures.js");

var expect = chakram.expect;

describe("Emergency Contacts", function () {
    describe("List Emergency Contacts (GET /patients/:patientid/emergencyContacts)", function () {
        // basic endpoint
        var list = function (patientId, accessToken, parameters) {
            if (typeof parameters === "undefined" || parameters === null) parameters = {};
            var query = querystring.stringify(parameters);

            var url = util.format("http://localhost:5000/v1/patients/%d/emergencyContacts?%s", patientId, query);
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
        // check it requires read access to the emergency contact
        patients.itRequiresReadAuthorization(listPatient);

        describe("with test emergency contacts set up", function () {
            // setup two patients
            var patient, otherPatient;
            before(function () {
                return auth.createTestUser().then(function (user) {
                    return patients.createMyPatient({}, user).then(function (p) {
                        patient = p;
                        return patients.createMyPatient({}, user).then(function (p) {
                            otherPatient = p;
                        });
                    });
                });
            });

            // setup a emergency contact for otherPatient
            before(function () {
                var create = Q.nbind(otherPatient.createEmergencyContact, otherPatient);
                return fixtures.build("EmergencyContact", {}).then(create);
            });

            // setup 40 emergency contacts for patient
            before(function () {
                // generate promise to create each emergencyContact
                var promises = [];
                var create = Q.nbind(patient.createEmergencyContact, patient);
                // create 1 emergency contact with a custom name
                promises.push(function () {
                    return fixtures.build("EmergencyContact", { firstName: "test fuzzy matching" }).then(create);
                });
                // create 39 emergency contacts with default data
                for (var i = 0; i < 39; i++) {
                    /*eslint-disable no-loop-func */
                    var promise = function () {
                        return fixtures.build("EmergencyContact", {}).then(create);
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
                return expect(listPatient(patient)).to.be.a.emergencyContact.listSuccess;
            });

            it("returns the correct count", function () {
                return listPatient(patient).then(function (response) {
                    expect(response.body.count).to.equal(40);
                });
            });

            describe("with limit parameter", function () {
                it("limits results to 25 by default", function () {
                    return listPatient(patient).then(function (response) {
                        console.log(response.body)
                        expect(response).to.be.a.emergencyContact.listSuccess;
                        expect(response.body.emergencyContacts.length).to.equal(25);
                        expect(response.body.count).to.equal(40);
                    });
                });

                it("lets us limit the results to less than 25", function () {
                    return listPatient(patient, { limit: 15 }).then(function (response) {
                        console.log(response.body)
                        expect(response).to.be.a.emergencyContact.listSuccess;
                        expect(response.body.emergencyContacts.length).to.equal(15);
                        expect(response.body.count).to.equal(40);
                    });
                });

                it("lets us limit the results to between 25 and 40", function () {
                    return listPatient(patient, { limit: 30 }).then(function (response) {
                        expect(response).to.be.a.emergencyContact.listSuccess;
                        expect(response.body.emergencyContacts.length).to.equal(30);
                        expect(response.body.count).to.equal(40);
                    });
                });

                // this also guarantees that only results for the correct patient are returned
                // (otherwise it would return a maximum of 41 emergency contacts, rather than 40)
                it("lets us limit the results to greater than 40, but caps at 40", function () {
                    return listPatient(patient, { limit: 50 }).then(function (response) {
                        expect(response).to.be.a.emergencyContact.listSuccess;
                        expect(response.body.emergencyContacts.length).to.equal(40);
                        expect(response.body.count).to.equal(40);
                    });
                });

                it("ignores a null limit parameter", function () {
                    return listPatient(patient, { limit: null }).then(function (response) {
                        expect(response).to.be.a.emergencyContact.listSuccess;
                        expect(response.body.emergencyContacts.length).to.equal(25);
                        expect(response.body.count).to.equal(40);
                    });
                });

                it("allows a zero limit parameter to return all results", function () {
                    return listPatient(patient, { limit: 0 }).then(function (response) {
                        expect(response).to.be.a.emergencyContact.listSuccess;
                        expect(response.body.emergencyContacts.length).to.equal(40);
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
                            expect(response).to.be.a.emergencyContact.listSuccess;
                            expect(defResponse.body).to.deep.equal(response.body);
                        });
                    });
                });

                it("lets us specify a valid offset", function () {
                    return listPatient(patient).then(function (defResponse) {
                        return listPatient(patient, { offset: 5 }).then(function (response) {
                            expect(response).to.be.a.emergencyContact.listSuccess;
                            expect(response.body.count).to.equal(40);
                            expect(response.body.emergencyContacts.length).to.equal(25);
                            expect(response.body.emergencyContacts.slice(0, 20)).to.deep.equal(defResponse.body.emergencyContacts.slice(5));
                        });
                    });
                });

                it("lets us specify a valid offset that means less results are returned", function () {
                    return listPatient(patient).then(function (defResponse) {
                        return listPatient(patient, { offset: 20 }).then(function (response) {
                            expect(response).to.be.a.emergencyContact.listSuccess;
                            expect(response.body.count).to.equal(40);
                            expect(response.body.emergencyContacts.length).to.equal(20);
                            expect(response.body.emergencyContacts.slice(0, 5)).to.deep.equal(defResponse.body.emergencyContacts.slice(20));
                        });
                    });
                });

                it("lets us specify a valid offset that means no results are returned", function () {
                    return listPatient(patient, { offset: 45 }).then(function (response) {
                        expect(response).to.be.a.emergencyContact.listSuccess;
                        expect(response.body.count).to.equal(40);
                        expect(response.body.emergencyContacts.length).to.equal(0);
                    });
                });
                it("lets us specify both an offset and limit parameter", function () {
                    return listPatient(patient).then(function (defResponse) {
                        return listPatient(patient, { offset: 5, limit: 5 }).then(function (resp) {
                            expect(resp).to.be.a.emergencyContact.listSuccess;
                            expect(resp.body.count).to.equal(40);
                            expect(resp.body.emergencyContacts.length).to.equal(5);
                            expect(resp.body.emergencyContacts.slice(0, 5)).to.deep.equal(defResponse.body.emergencyContacts.slice(5, 10));
                        });
                    });
                });

                it("ignores a null offset", function () {
                    return listPatient(patient).then(function (defResponse) {
                        return listPatient(patient, { offset: null }).then(function (response) {
                            expect(response).to.be.a.emergencyContact.listSuccess;
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
                        expect(response).to.be.a.emergencyContact.listSuccess;

                        var sorted = response.body.emergencyContacts.slice(0).sort(function (emergencyContactA, emergencyContactB) {
                            // numeric IDs
                            return emergencyContactA.id - emergencyContactB.id;
                        });
                        expect(response.body.emergencyContacts).to.deep.equal(sorted);
                    });
                });

                it("allows sorting by id", function () {
                    return listPatient(patient, { sort_by: "id" }).then(function (response) {
                        expect(response).to.be.a.emergencyContact.listSuccess;

                        var sorted = response.body.emergencyContacts.slice(0).sort(function (emergencyContactA, emergencyContactB) {
                            // numeric IDs
                            return emergencyContactA.id - emergencyContactB.id;
                        });
                        expect(response.body.emergencyContacts).to.deep.equal(sorted);
                    });
                });

                it("ignores a null sort_by", function () {
                    return listPatient(patient, { sort_by: null }).then(function (response) {
                        expect(response).to.be.a.emergencyContact.listSuccess;

                        var sorted = response.body.emergencyContacts.slice(0).sort(function (emergencyContactA, emergencyContactB) {
                            // numeric IDs
                            return emergencyContactA.id - emergencyContactB.id;
                        });
                        expect(response.body.emergencyContacts).to.deep.equal(sorted);
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
                            expect(response).to.be.a.emergencyContact.listSuccess;
                            expect(response.body).to.deep.equal(defResponse.body);
                        });
                    });
                });

                it("allows sorting in ascending order", function () {
                    return listPatient(patient, { sort_order: "asc" }).then(function (response) {
                        expect(response).to.be.a.emergencyContact.listSuccess;
                        var sorted = response.body.emergencyContacts.slice(0).sort(function (emergencyContactA, emergencyContactB) {
                            // numeric IDs
                            return emergencyContactA.id - emergencyContactB.id;
                        });
                        expect(response.body.emergencyContacts).to.deep.equal(sorted);
                    });
                });

                it("allows sorting in descending order", function () {
                    return listPatient(patient, { sort_order: "desc" }).then(function (response) {
                        expect(response).to.be.a.emergencyContact.listSuccess;
                        var sorted = response.body.emergencyContacts.slice(0).sort(function (emergencyContactA, emergencyContactB) {
                            // numeric IDs
                            return emergencyContactA.id - emergencyContactB.id;
                        }).reverse();
                        expect(response.body.emergencyContacts).to.deep.equal(sorted);
                    });
                });

                it("allows both sort_by and sort_order", function () {
                    return listPatient(patient, { sort_order: "desc", sort_by: "id" }).then(function (response) {
                        expect(response).to.be.a.emergencyContact.listSuccess;
                        var sorted = response.body.emergencyContacts.slice(0).sort(function (emergencyContactA, emergencyContactB) {
                            // string names
                            return emergencyContactA.id - emergencyContactB.id;
                        }).reverse();
                        expect(response.body.emergencyContacts).to.deep.equal(sorted);
                    });
                });

                it("ignores a null sort_order", function () {
                    return listPatient(patient).then(function (defResponse) {
                        return listPatient(patient, { sort_order: null }).then(function (response) {
                            expect(response).to.be.a.emergencyContact.listSuccess;
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

            describe("with firstName parameter", function () {
                it("doesn't filter by firstName by default", function () {
                    return listPatient(patient).then(function (response) {
                        expect(response).to.be.a.emergencyContact.listSuccess;
                        expect(response.body.count).to.equal(40);
                    });
                });

                it("ignores a null firstName parameter", function () {
                    return listPatient(patient, { firstName: null }).then(function (response) {
                        expect(response).to.be.a.emergencyContact.listSuccess;
                        expect(response.body.count).to.equal(40);
                    });
                });

                it("handles no results", function () {
                    return listPatient(patient, { firstName: "notanamelikethis" }).then(function (response) {
                        expect(response).to.be.a.emergencyContact.listSuccess;
                        expect(response.body.count).to.equal(0);
                        expect(response.body.emergencyContacts.length).to.equal(0);
                    });
                });
            });
        });
    });
});
