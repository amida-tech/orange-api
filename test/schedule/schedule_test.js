"use strict";
/*eslint max-len:0*/
var chakram     = require("chakram"),
    moment      = require("moment-timezone"),
    querystring = require("querystring"),
    curry       = require("curry"),
    Q           = require("q"),
    util        = require("util"),
    auth        = require("../common/auth.js"),
    patients    = require("../patients/common.js"),
    medications = require("../medications/common.js");

var expect = chakram.expect;

// we check the catual schedule generation process in the medications unit tests, so here we
// just verify it matches the documented schema rather than actually verifying the data

describe("Schedule", function () {
    describe("Show Patient Schedule (GET /patients/:patientid/schedule)", function () {
        // given a patient ID, start date and end date, try and show the schedule
        var show = module.exports.show = function (startDate, endDate, medicationId, patientId, accessToken) {
            if (typeof startDate !== "undefined" && startDate !== null && typeof startDate !== "string")
                startDate = startDate.format("YYYY-MM-DD");
            if (typeof endDate !== "undefined" && endDate !== null && typeof endDate !== "string")
                endDate = endDate.format("YYYY-MM-DD");

            var query = {
                start_date: startDate,
                end_date: endDate,
                medication_id: medicationId
            };
            // optional
            // if null, still pass in
            if (typeof startDate !== "undefined") query.start_date = startDate;
            if (typeof startDate !== "undefined") query.end_date = endDate;
            if (typeof medicationId !== "undefined") query.medication_id = medicationId;
            query = querystring.stringify(query);

            var url = util.format("http://localhost:3000/v1/patients/%d/schedule?%s", patientId, query);
            return chakram.get(url, auth.genAuthHeaders(accessToken));
        };

        describe("testing access permissions", function () {
            // check it requires a valid user and patient
            patients.itRequiresAuthentication(curry(show)(null, null, null));
            patients.itRequiresValidPatientId(curry(show)(null, null, null));

            // helper to take a patient and medication, and try and show the schedule for _just_
            // that medication. used to test medication-specific authorization.
            var showScheduleMedication = function (patient, medication) {
                return show(null, null, medication._id, patient._id, patient.user.accessToken);
            };

            // helper to show schedule for an example medication
            // takes a patient, creates a medication for them and then attempts to show their
            // schedule
            // only to be used for testing access permissions: the generated schedule will be
            // blank
            var showSchedule = function (patient) {
                return Q.nbind(patient.createMedication, patient)({ name: "foobar" }).then(function () {
                    // we don't pass medication._id because we're just checking the overall
                    // schedule endpoint here (medication_id is optional)
                    return show(null, null, null, patient._id, patient.user.accessToken);
                });
            };

            // check it requires read access to patient
            patients.itRequiresReadAuthorization(showSchedule);
            // check it only returns schedule results for medications we have access to
            medications.itRequiresReadListAuthorization("schedule")(showScheduleMedication);

            describe("with test data", function () {
                // setup two patients the user has read access to
                var patient, noneMedication, defaultMedication, suspendedMedication;
                before(function () {
                    // create two test users
                    return Q.all([auth.createTestUser(), auth.createTestUser()]).spread(function (me, other) {
                        // create patient and share read-only with main user
                        return patients.createOtherPatient({}, me, other).then(function (p) {
                            patient = p;
                            return Q.nbind(p.share, patient)(me.email, "read", "anyone");
                        });
                    }).then(function () {
                        // create three medications for the patient, one paused
                        return Q.nbind(patient.createMedication, patient)({
                            name: "foobar none",
                            access_anyone: "none",
                            schedule: {
                                as_needed: false,
                                regularly: true,
                                until: { type: "forever" },
                                frequency: { n: 1, unit: "day" },
                                times: [{ type: "exact", time: "09:00" }],
                                take_with_food: null,
                                take_with_medications: [],
                                take_without_medications: []
                            }
                        }).then(function (m) {
                            noneMedication = m;
                            return m;
                        }).then(function () {
                            return Q.nbind(patient.createMedication, patient)({
                                name: "foobar def",
                                access_anyone: "default",
                                schedule: {
                                    as_needed: false,
                                    regularly: true,
                                    until: { type: "forever" },
                                    frequency: { n: 1, unit: "day" },
                                    times: [{ type: "exact", time: "09:00" }],
                                    take_with_food: null,
                                    take_with_medications: [],
                                    take_without_medications: []
                                }
                            });
                        }).then(function (m) {
                            defaultMedication = m;
                        }).then(function () {
                            return Q.nbind(patient.createMedication, patient)({
                                name: "foobar def",
                                access_anyone: "default",
                                status: "suspended",
                                schedule: {
                                    as_needed: false,
                                    regularly: true,
                                    until: { type: "forever" },
                                    frequency: { n: 1, unit: "day" },
                                    times: [{ type: "exact", time: "09:00" }],
                                    take_with_food: null,
                                    take_with_medications: [],
                                    take_without_medications: []
                                }
                            });
                        }).then(function (m) {
                            suspendedMedication = m;
                        });
                    });
                });

                it("respects medication permissions by only showing active results from defaultMedication", function () {
                    return show(null, null, null, patient._id, patient.user.accessToken).then(function (response) {
                        // extract med IDs
                        var ids = response.body.schedule.map(function (item) {
                            return item.medication_id;
                        });

                        // check we have events for medication we have med-level access to
                        expect(ids.filter(function (id) {
                            return id === defaultMedication._id;
                        }).length).to.not.equal(0);
                        // and none for medication we have patient-level access to but no med-level access
                        expect(ids.filter(function (id) {
                            return id === noneMedication._id;
                        }).length).to.equal(0);
                        // and none for paused medication
                        expect(ids.filter(function (id) {
                            return id === suspendedMedication._id;
                        }).length).to.equal(0);
                    });
                });
            });
        });

        describe("with test patients", function () {
            // setup user with two patients
            var user, patient, otherPatient;
            beforeEach(function () {
                // create patient user
                return auth.createTestUser().then(function (u) {
                    user = u;
                }).then(function () {
                    // create and store patients
                    return Q.all([
                        patients.createMyPatient({}, user),
                        patients.createMyPatient({}, user)
                    ]).spread(function (p1, p2) {
                        patient = p1;
                        otherPatient = p2;
                    });
                });
            });

            // helper function to return a promise to create a medication for
            // a specified patient with a once-daily schedule
            var create = function (p) {
                return function () {
                    return Q.nbind(p.createMedication, p)({
                        name: "Test Medication",
                        schedule: {
                            as_needed: false,
                            regularly: true,
                            until: { type: "forever" },
                            frequency: { n: 1, unit: "day" },
                            times: [{ type: "exact", time: "09:00" }],
                            take_with_food: null,
                            take_with_medications: [],
                            take_without_medications: []
                        }
                    }).then(function (m) {
                        m.schedules[0].date = moment().subtract(10, "days").unix();
                        m.markModified("schedules");
                        p.markModified("medications");
                        return Q.nbind(patient.save, patient)().then(function () {
                            return m;
                        });
                    });
                };
            };

            describe("with test medications", function () {
                // create medication for patient and otherPatient, both with
                // once daily schedules
                beforeEach(function () {
                    return create(patient)().then(create(otherPatient));
                });

                it("does not include medications not belonging to this patient", function () {
                    return show(null, null, null, patient._id, user.accessToken).then(function (response) {
                        expect(response).to.be.a.schedule.success;
                        response.body.schedule.forEach(function (item) {
                            // check each item is from patient's medication as opposed to otherPatient's
                            expect(item.medication_id).to.equal(patient.medications[0]._id);
                        });
                    });
                });

                it("actually returns schedules", function () {
                    // check we're not just getting an empty schedule back
                    return show(null, null, null, patient._id, user.accessToken).then(function (response) {
                        expect(response).to.be.a.schedule.success;
                        expect(response.body.schedule).to.not.be.empty;
                    });
                });

                describe("testing medication_id", function () {
                    it("allows no medication ID", function () {
                        return expect(show(null, null, null, patient._id, user.accessToken)).to.be.a.schedule.success;
                    });

                    it("allows a blank medication ID", function () {
                        return expect(show(null, null, "", patient._id, user.accessToken)).to.be.a.schedule.success;
                    });

                    it("rejects an invalid medication ID", function () {
                        var endpoint = show(null, null, "foo", patient._id, user.accessToken);
                        return expect(endpoint).to.be.an.api.error(400, "invalid_medication_id");
                    });

                    it("allows a valid medication ID belonging to this patient", function () {
                        var endpoint = show(null, null, patient.medications[0]._id, patient._id, user.accessToken);
                        return expect(endpoint).to.be.a.schedule.success;
                    });

                    it("rejects a medication ID of a medication belonging to a different patient", function () {
                        var endpoint = show(null, null, otherPatient.medications[0]._id, patient._id, user.accessToken);
                        return expect(endpoint).to.be.an.api.error(400, "invalid_medication_id");
                    });
                });
            });

            describe("with multiple medications", function () {
                // create two medications, both for patient and both with
                // once-daily schedules
                beforeEach(function () {
                    return create(patient)().then(create(patient));
                });

                it("shows all medications", function () {
                    // explicitly generate schedule for the next week, so we can check the count
                    var today = moment();
                    var nextWeek = moment().add(6, "days"); // stop date included
                    return show(today, nextWeek, null, patient._id, user.accessToken).then(function (response) {
                        // extract med IDs
                        var ids = response.body.schedule.map(function (item) {
                            return item.medication_id;
                        });

                        // for each medication, check we have 7 entries
                        expect(ids.filter(function (id) {
                            return id === patient.medications[0]._id;
                        }).length).to.equal(7);
                        expect(ids.filter(function (id) {
                            return id === patient.medications[1]._id;
                        }).length).to.equal(7);

                        // check we have 14 entries total
                        expect(ids.length).to.equal(14);
                    });
                });

                it("is in ascending date order", function () {
                    return show(null, null, null, patient._id, user.accessToken).then(function (response) {
                        // extract dates (preserving order)
                        var dates = response.body.schedule.map(function (item) {
                            return item.date;
                        });

                        var prevDate = dates[0];
                        dates.forEach(function (date) {
                            // use momentjs to compare
                            date = moment(date);
                            expect(date.isBefore(prevDate)).to.be.false;
                            prevDate = date;
                        });
                    });
                });

                describe("testing start/end dates", function () {
                    it("it defaults to showing events for the next week", function () {
                        var today = moment.utc();
                        var nextWeek = moment.utc().add(6, "days"); // stop date included
                        var ep1 = show(null, null, null, patient._id, user.accessToken);
                        var ep2 = show(today, nextWeek, null, patient._id, user.accessToken);
                        return ep1.then(function (resp1) {
                            return ep2.then(function (resp2) {
                                expect(resp1.body).to.deep.equal(resp2.body);
                            });
                        });
                    });

                    it("filters when valid dates are specified", function () {
                        // arbitrary range
                        var start = moment().subtract(21, "days");
                        var end = moment().add(3, "days");
                        // we only care about days
                        start = moment(start.format("YYYY-MM-DD"), "YYYY-MM-DD");
                        end = moment(end.format("YYYY-MM-DD"), "YYYY-MM-DD");

                        return show(start, end, null, patient._id, user.accessToken).then(function (response) {
                            expect(response).to.be.a.schedule.success;
                            response.body.schedule.forEach(function (item) {
                                var date = moment(moment(item.date).format("YYYY-MM-DD"));
                                // passes equality
                                expect(date.isBefore(start)).to.be.false;
                                expect(date.isAfter(end)).to.be.false;
                            });
                        });
                    });

                    it("handles just a start date", function () {
                        var start = moment().add(3, "days");
                        start = moment(start.format("YYYY-MM-DD"), "YYYY-MM-DD");

                        return show(start, null, null, patient._id, user.accessToken).then(function (response) {
                            expect(response).to.be.a.schedule.success;
                            response.body.schedule.forEach(function (item) {
                                var date = moment(moment(item.date).format("YYYY-MM-DD"));
                                expect(date.isBefore(start)).to.be.false;
                            });
                        });
                    });

                    it("handles just an end date", function () {
                        var end = moment().add(3, "days");
                        end = moment(end.format("YYYY-MM-DD"), "YYYY-MM-DD");

                        return show(null, end, null, patient._id, user.accessToken).then(function (response) {
                            expect(response).to.be.a.schedule.success;
                            response.body.schedule.forEach(function (item) {
                                var date = moment(moment(item.date).format("YYYY-MM-DD"));
                                expect(date.isAfter(end)).to.be.false;
                            });
                        });
                    });

                    it("allows a blank start date", function () {
                        return expect(show("", null, null, patient._id, user.accessToken)).to.be.a.schedule.success;
                    });

                    it("allows a blank end date", function () {
                        return expect(show(null, "", null, patient._id, user.accessToken)).to.be.a.schedule.success;
                    });

                    it("rejects an invalid start date", function () {
                        var endpoint = show("foo", null, null, patient._id, user.accessToken);
                        return expect(endpoint).to.be.an.api.error(400, "invalid_start");
                    });

                    it("rejects an invalid end date", function () {
                        var endpoint = show(null, "foo", null, patient._id, user.accessToken);
                        return expect(endpoint).to.be.an.api.error(400, "invalid_end");
                    });

                    it("doesn't allow a start date after the end date", function () {
                        var start = moment().add(1, "day");
                        var end = moment().subtract(1, "day");
                        return show(start, end, null, patient._id, user.accessToken).then(function (response) {
                            // we want either invalid_start of invalid_end
                            var error = response.body.errors[0];
                            expect(["invalid_start", "invalid_end"]).to.contain(error);
                            expect(response).to.be.an.api.error(400, error);
                        });
                    });

                    it("allows a start date equal to the end date", function () {
                        var today = moment();
                        var endpoint = show(today, today, null, patient._id, user.accessToken);
                        return expect(endpoint).to.be.a.schedule.success;
                    });

                    // further date validation testing is performed in ScheduleGenerator unit tests
                });
            });
        });

        // everything more granular is tested in unit/medication_schedule_generator_test.js
    });
});
