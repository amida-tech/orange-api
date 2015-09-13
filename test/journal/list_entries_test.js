"use strict";
var chakram         = require("chakram"),
    util            = require("util"),
    moment          = require("moment"),
    Q               = require("q"),
    querystring     = require("querystring"),
    auth            = require("../common/auth.js"),
    patients        = require("../patients/common.js"),
    medications     = require("../medications/common.js"),
    fixtures        = require("./fixtures.js");

var expect = chakram.expect;

describe("Journal", function () {
    describe("List Entries (GET /patients/:patientid/journal)", function () {
        // basic endpoint
        var list = module.exports.list = function (patientId, accessToken, parameters) {
            if (typeof parameters === "undefined" || parameters === null) parameters = {};
            var query = querystring.stringify(parameters);

            var url = util.format("http://localhost:3000/v1/patients/%d/journal?%s", patientId, query);
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
        // check it requires read access to the patient
        patients.itRequiresReadAuthorization(listPatient);
        // check if only shows entries we have read access to
        medications.itRequiresReadListAuthorization("entries")(function (patient, medication) {
            // create a journal entry for that patient
            var create = Q.nbind(patient.createJournalEntry, patient);
            var createEntry = fixtures.build("JournalEntry", {}).then(function (entry) {
                var data = entry.getData();
                data.date = moment().toISOString();
                data.medication_ids = [medication._id];
                return data;
            }).then(create);

            // list all entries for that patient (new patient each time)
            return createEntry.then(function() {
                return listPatient(patient);
            });
        });

        describe("with test entries set up", function () {
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

            // setup an entry for otherPatient
            before(function () {
                var create = Q.nbind(otherPatient.createJournalEntry, otherPatient);
                return fixtures.build("JournalEntry", {}).then(function (entry) {
                    var data = entry.getData();
                    data.date = moment().toISOString();
                    return data;
                }).then(create);
            });

            // setup two test medications for the patient
            before(function () {
                var create = Q.nbind(patient.createMedication, patient);
                return create({
                    name: "med 1"
                }).then(function () {
                    return create({
                        name: "med 2"
                    });
                });
            });

            // setup 40 entries for patient
            before(function () {
                // generate promise to create each entry
                var promises = [];
                var create = Q.nbind(patient.createJournalEntry, patient);
                // create 1 entry with a custom date, text and medication_ids
                promises.push(function () {
                    return fixtures.build("JournalEntry", {}).then(function (entry) {
                        var data = entry.getData();
                        data.date = moment().subtract(6, "months").toISOString();
                        data.text = "test fuzzy matching";
                        data.medication_ids = [patient.medications[0]._id, patient.medications[1]._id];
                        return data;
                    }).then(create);
                });
                // create 39 entries with default data
                for (var i = 0; i < 39; i++) {
                    /*eslint-disable no-loop-func */
                    var promise = (function (offset) {
                        return function () {
                            return fixtures.build("JournalEntry", {}).then(function (entry) {
                                var data = entry.getData();
                                // can't all be the same time so we can test sorting by time
                                data.date = moment().add(offset, "minutes").toISOString();
                                return data;
                            }).then(create);
                        };
                    })(i);
                    /*eslint-enable no-loop-func */
                    promises.push(promise);
                }

                // run promises sequentially with reduce
                return promises.reduce(function (promise, f) {
                    return promise.then(f);
                }, Q());
            });

            it("returns a successful response", function () {
                return expect(listPatient(patient)).to.be.a.journal.listSuccess;
            });

            it("returns the correct count", function () {
                return listPatient(patient).then(function (response) {
                    expect(response.body.count).to.equal(40);
                });
            });

            describe("with limit parameter", function () {
                it("limits results to 25 by default", function () {
                    return listPatient(patient).then(function (response) {
                        expect(response).to.be.a.journal.listSuccess;
                        expect(response.body.entries.length).to.equal(25);
                        expect(response.body.count).to.equal(40);
                    });
                });

                it("lets us limit the results to less than 25", function () {
                    return listPatient(patient, { limit: 15 }).then(function (response) {
                        expect(response).to.be.a.journal.listSuccess;
                        expect(response.body.entries.length).to.equal(15);
                        expect(response.body.count).to.equal(40);
                    });
                });

                it("lets us limit the results to between 25 and 40", function () {
                    return listPatient(patient, { limit: 30 }).then(function (response) {
                        expect(response).to.be.a.journal.listSuccess;
                        expect(response.body.entries.length).to.equal(30);
                        expect(response.body.count).to.equal(40);
                    });
                });

                // this also guarantees that only results for the correct patient are returned
                // (otherwise it would return a maximum of 41 entries, rather than 40)
                it("lets us limit the results to greater than 40, but caps at 40", function () {
                    return listPatient(patient, { limit: 50 }).then(function (response) {
                        expect(response).to.be.a.journal.listSuccess;
                        expect(response.body.entries.length).to.equal(40);
                        expect(response.body.count).to.equal(40);
                    });
                });

                it("ignores a null limit parameter", function () {
                    return listPatient(patient, { limit: null }).then(function (response) {
                        expect(response).to.be.a.journal.listSuccess;
                        expect(response.body.entries.length).to.equal(25);
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
                            expect(response).to.be.a.journal.listSuccess;
                            expect(defResponse.body).to.deep.equal(response.body);
                        });
                    });
                });

                it("lets us specify a valid offset", function () {
                    return listPatient(patient).then(function (defResponse) {
                        return listPatient(patient, { offset: 5 }).then(function (response) {
                            expect(response).to.be.a.journal.listSuccess;
                            expect(response.body.count).to.equal(40);
                            expect(response.body.entries.length).to.equal(25);

                            var offsetResults = response.body.entries.slice(0, 20);
                            var defaultResults = defResponse.body.entries.slice(5);
                            expect(offsetResults).to.deep.equal(defaultResults);
                        });
                    });
                });

                it("lets us specify a valid offset that means less results are returned", function () {
                    return listPatient(patient).then(function (defResponse) {
                        return listPatient(patient, { offset: 20 }).then(function (response) {
                            expect(response).to.be.a.journal.listSuccess;
                            expect(response.body.count).to.equal(40);
                            expect(response.body.entries.length).to.equal(20);

                            var offsetResults = response.body.entries.slice(0, 5);
                            var defaultResults = defResponse.body.entries.slice(20);
                            expect(offsetResults).to.deep.equal(defaultResults);
                        });
                    });
                });

                it("lets us specify a valid offset that means no results are returned", function () {
                    return listPatient(patient, { offset: 45 }).then(function (response) {
                        expect(response).to.be.a.journal.listSuccess;
                        expect(response.body.count).to.equal(40);
                        expect(response.body.entries.length).to.equal(0);
                    });
                });
                it("lets us specify both an offset and limit parameter", function () {
                    return listPatient(patient).then(function (defResponse) {
                        return listPatient(patient, { offset: 5, limit: 5 }).then(function (response) {
                            expect(response).to.be.a.journal.listSuccess;
                            expect(response.body.count).to.equal(40);
                            expect(response.body.entries.length).to.equal(5);

                            var offsetResults = response.body.entries.slice(0, 5);
                            var defaultResults = defResponse.body.entries.slice(5, 10);
                            expect(offsetResults).to.deep.equal(defaultResults);
                        });
                    });
                });

                it("ignores a null offset", function () {
                    return listPatient(patient).then(function (defResponse) {
                        return listPatient(patient, { offset: null }).then(function (response) {
                            expect(response).to.be.a.journal.listSuccess;
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
                        expect(response).to.be.a.journal.listSuccess;

                        var sorted = response.body.entries.slice(0).sort(function (entryA, entryB) {
                            // numeric IDs
                            return entryA.id - entryB.id;
                        });
                        expect(response.body.entries).to.deep.equal(sorted);
                    });
                });

                it("allows sorting by id", function () {
                    return listPatient(patient, { sort_by: "id" }).then(function (response) {
                        expect(response).to.be.a.journal.listSuccess;

                        var sorted = response.body.entries.slice(0).sort(function (entryA, entryB) {
                            // numeric IDs
                            return entryA.id - entryB.id;
                        });
                        expect(response.body.entries).to.deep.equal(sorted);
                    });
                });

                it("allows sorting by date", function () {
                    return listPatient(patient, { sort_by: "date" }).then(function (response) {
                        expect(response).to.be.a.journal.listSuccess;

                        var sorted = response.body.entries.slice(0).sort(function (entryA, entryB) {
                            // ISO-formatted UTC dates
                            var dateA = moment.utc(entryA.date);
                            var dateB = moment.utc(entryB.date);

                            if (dateA.isBefore(dateB)) return -1;
                            else if (dateB.isBefore(dateA)) return 1;
                            else return 0;
                        });
                        expect(response.body.entries).to.deep.equal(sorted);
                    });
                });

                it("ignores a null sort_by", function () {
                    return listPatient(patient, { sort_by: null }).then(function (response) {
                        expect(response).to.be.a.journal.listSuccess;

                        var sorted = response.body.entries.slice(0).sort(function (entryA, entryB) {
                            // numeric IDs
                            return entryA.id - entryB.id;
                        });
                        expect(response.body.entries).to.deep.equal(sorted);
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
                            expect(response).to.be.a.journal.listSuccess;
                            expect(response.body).to.deep.equal(defResponse.body);
                        });
                    });
                });

                it("allows sorting in ascending order", function () {
                    return listPatient(patient, { sort_order: "asc" }).then(function (response) {
                        expect(response).to.be.a.journal.listSuccess;
                        var sorted = response.body.entries.slice(0).sort(function (entryA, entryB) {
                            // numeric IDs
                            return entryA.id - entryB.id;
                        });
                        expect(response.body.entries).to.deep.equal(sorted);
                    });
                });

                it("allows sorting in descending order", function () {
                    return listPatient(patient, { sort_order: "desc" }).then(function (response) {
                        expect(response).to.be.a.journal.listSuccess;
                        var sorted = response.body.entries.slice(0).sort(function (entryA, entryB) {
                            // numeric IDs
                            return entryA.id - entryB.id;
                        }).reverse();
                        expect(response.body.entries).to.deep.equal(sorted);
                    });
                });

                it("allows both sort_by and sort_order", function () {
                    return listPatient(patient, { sort_order: "desc", sort_by: "date" }).then(function (response) {
                        expect(response).to.be.a.journal.listSuccess;
                        var sorted = response.body.entries.slice(0).sort(function (entryA, entryB) {
                            // ISO-formatted UTC dates
                            var dateA = moment.utc(entryA.date);
                            var dateB = moment.utc(entryB.date);

                            if (dateA.isBefore(dateB)) return -1;
                            else if (dateB.isBefore(dateA)) return 1;
                            else return 0;
                        }).reverse();
                        expect(response.body.entries).to.deep.equal(sorted);
                    });
                });

                it("ignores a null sort_order", function () {
                    return listPatient(patient).then(function (defResponse) {
                        return listPatient(patient, { sort_order: null }).then(function (response) {
                            expect(response).to.be.a.journal.listSuccess;
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

            describe("with medication_ids parameter", function () {
                it("shows all medications by default", function () {
                    return listPatient(patient).then(function (response) {
                        expect(response).to.be.a.journal.listSuccess;
                        expect(response.body.count).to.equal(40);
                    });
                });

                it("ignores a null medication_ids", function () {
                    return listPatient(patient).then(function (defResponse) {
                        return listPatient(patient, { medications_ids: null }).then(function (response) {
                            expect(response).to.be.a.journal.listSuccess;
                            expect(response.body).to.deep.equal(defResponse.body);
                        });
                    });
                });

                it("ignores an empty medication_ids", function () {
                    return listPatient(patient).then(function (defResponse) {
                        return listPatient(patient, { medications_ids: [] }).then(function (response) {
                            expect(response).to.be.a.journal.listSuccess;
                            expect(response.body).to.deep.equal(defResponse.body);
                        });
                    });
                });

                it("filters by a valid medication_ids", function () {
                    return listPatient(patient, {
                        medication_ids: [patient.medications[0]._id]
                    }).then(function (response) {
                        expect(response).to.be.a.journal.listSuccess;
                        expect(response.body.count).to.equal(1);
                    });
                });

                it("filters by all medications in medicaion_ids", function () {
                    return listPatient(patient, {
                        medication_ids: [patient.medications[0]._id, patient.medications[1]._id]
                    }).then(function (response) {
                        expect(response).to.be.a.journal.listSuccess;
                        expect(response.body.count).to.equal(1);
                    });
                });

                it("rejects a medication_ids containing an invalid medication", function () {
                    return expect(listPatient(patient, {
                        medication_ids: [99999]
                    })).to.be.an.api.error(400, "invalid_medication_id");
                });

                it("rejects an invalid medication_ids", function () {
                    return expect(listPatient(patient, {
                        medication_ids: ["foo"]
                    })).to.be.an.api.error(400, "invalid_medication_id");
                });

                it("rejects a non-array medication_ids", function () {
                    return expect(listPatient(patient, {
                        medication_ids: "foo"
                    })).to.be.an.api.error(400, "invalid_medication_id");
                });
            });

            describe("with start_date and end_date parameters", function () {
                it("shows all entries by default", function () {
                    return listPatient(patient).then(function (response) {
                        expect(response).to.be.a.journal.listSuccess;
                        expect(response.body.count).to.equal(40);
                    });
                });

                it("ignores a null start_date and end_date", function () {
                    return listPatient(patient).then(function (defResponse) {
                        return listPatient(patient, { start_date: null, end_date: null }).then(function (response) {
                            expect(response).to.be.a.journal.listSuccess;
                            expect(response.body).to.deep.equal(defResponse.body);
                        });
                    });
                });

                it("can filter by just a start_date", function () {
                    return listPatient(patient, {
                        start_date: moment().subtract(3, "months").toISOString()
                    }).then(function (response) {
                        expect(response).to.be.a.journal.listSuccess;
                        expect(response.body.count).to.equal(39);
                    });
                });

                it("can filter by just an end_date", function () {
                    return listPatient(patient, {
                        end_date: moment().subtract(3, "months").toISOString()
                    }).then(function (response) {
                        expect(response).to.be.a.journal.listSuccess;
                        expect(response.body.count).to.equal(1);
                    });
                });

                it("can filter by both a start_date and end_date", function () {
                    return listPatient(patient, {
                        start_date: moment().subtract(12, "months").toISOString(),
                        end_date: moment().subtract(3, "months").toISOString()
                    }).then(function (response) {
                        expect(response).to.be.a.journal.listSuccess;
                        expect(response.body.count).to.equal(1);
                    });
                });

                it("rejects a start date after the end date", function () {
                    return listPatient(patient, {
                        start_date: moment().subtract(3, "months").toISOString(),
                        end_date: moment().subtract(12, "months").toISOString()
                    }).then(function (response) {
                        // we want either invalid_start of invalid_end
                        var error = response.body.errors[0];
                        expect(["invalid_start", "invalid_end"]).to.contain(error);
                        expect(response).to.be.an.api.error(400, error);
                    });
                });

                it("rejects an invalid start date", function () {
                    return expect(listPatient(patient, {
                        start_date: "foo"
                    })).to.be.an.api.error(400, "invalid_start");
                });

                it("rejects an invalid end date", function () {
                    return expect(listPatient(patient, {
                        end_date: "foo"
                    })).to.be.an.api.error(400, "invalid_end");
                });
            });

            describe("with text parameter", function () {
                it("doesn't filter by text by default", function () {
                    return listPatient(patient).then(function (response) {
                        expect(response).to.be.a.journal.listSuccess;
                        expect(response.body.count).to.equal(40);
                    });
                });

                it("ignores a null text parameter", function () {
                    return listPatient(patient, { text: null }).then(function (response) {
                        expect(response).to.be.a.journal.listSuccess;
                        expect(response.body.count).to.equal(40);
                    });
                });

                it("handles no results", function () {
                    return listPatient(patient, { text: "notatextlikethis" }).then(function (response) {
                        expect(response).to.be.a.journal.listSuccess;
                        expect(response.body.count).to.equal(0);
                        expect(response.body.entries.length).to.equal(0);
                    });
                });

                it("handles searching exactly", function () {
                    return listPatient(patient, { text: "matching" }).then(function (response) {
                        expect(response).to.be.a.journal.listSuccess;
                        expect(response.body.count).to.equal(1);
                        expect(response.body.entries.length).to.equal(1);
                        expect(response.body.entries[0].text).to.equal("test fuzzy matching");
                    });
                });

                it("handles searching fuzzily", function () {
                    return listPatient(patient, { text: "fzzy" }).then(function (response) {
                        expect(response).to.be.a.journal.listSuccess;
                        expect(response.body.count).to.equal(1);
                        expect(response.body.entries.length).to.equal(1);
                        expect(response.body.entries[0].text).to.equal("test fuzzy matching");
                    });
                });
            });
        });
    });
});
