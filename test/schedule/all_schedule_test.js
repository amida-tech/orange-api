"use strict";
var chakram         = require("chakram"),
    curry           = require("curry"),
    util            = require("util"),
    Q               = require("q"),
    querystring     = require("querystring"),
    moment          = require("moment-timezone"),
    auth            = require("../common/auth.js"),
    patients        = require("../patients/common.js"),
    fixtures        = require("../medications/fixtures.js");

var expect = chakram.expect;

describe("Schedule", function () {
    describe("View Schedule for All User's Patients (GET /schedule)", function () {
        // basic endpoint to view schedule
        var schedule = function (startDate, endDate, accessToken) {
            if (typeof startDate !== "undefined" && startDate !== null && typeof startDate !== "string")
                startDate = startDate.format("YYYY-MM-DD");
            if (typeof endDate !== "undefined" && endDate !== null && typeof endDate !== "string")
                endDate = endDate.format("YYYY-MM-DD");
            var query = querystring.stringify({
                start_date: startDate,
                end_date: endDate
            });

            var url = util.format("http://localhost:5000/v1/schedule?%s", query);
            return chakram.get(url, auth.genAuthHeaders(accessToken));
        };
        // check it requires valid user authentication
        auth.itRequiresAuthentication(curry(schedule)(null, null));

        describe("with test medications set up", function () {
            // setup a test user
            var user;
            before(function () {
                return auth.createTestUser().then(function (u) {
                    user = u;
                });
            });

            // setup a test patient owned by that user
            var patient;
            before(function () {
                return patients.createMyPatient({}, user).then(function (p) {
                    patient = p;
                });
            });

            // setup another test patient owned by another user
            var otherPatient;
            before(function () {
                return auth.createTestUser().then(function (other) {
                    return patients.createOtherPatient({}, user, other).then(function (p) {
                        otherPatient = p;
                        return Q.nbind(p.share, p)(user.email, "read", "anyone");
                    });
                });
            });

            // setup a daily medication for patient
            var medication;
            before(function () {
                var create = Q.nbind(patient.createMedication, patient);
                return fixtures.build("Medication", {
                    name: "foo"
                }).then(function (m) {
                    // setting in fixture building above
                    // confuses the virtual named schedule
                    m.setData({
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
                    }, patient.habits);
                    return m.getData(patient);
                }).then(function (data) {
                    data.schedule.times = data.schedule.times.map(function (time) {
                        delete time.description;
                        delete time.heading;
                        return time;
                    });
                    return data;
                }).then(create).then(function (m) {
                    medication = m;
                });
            });

            // setup a daily medication for the other user's patient
            var otherMedication;
            before(function () {
                var create = Q.nbind(otherPatient.createMedication, otherPatient);
                return fixtures.build("Medication", {
                    name: "bar"
                }).then(function (m) {
                    // setting in fixture building above
                    // confuses the virtual named schedule
                    m.setData({
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
                    }, patient.habits);
                    return m.getData(patient);
                }).then(function (data) {
                    data.schedule.times = data.schedule.times.map(function (time) {
                        delete time.description;
                        delete time.heading;
                        return time;
                    });
                    return data;
                }).then(create).then(function (m) {
                    otherMedication = m;
                });
            });

            it("schedules both medications", function () {
                var day = moment().add(5, "days");
                return schedule(day, day, user.accessToken, {}).then(function (response) {
                    expect(response).to.be.a.schedule.success;
                    expect(response.body.schedule.length).to.equal(2);

                    var medIds = response.body.schedule.map(function (item) {
                        return item.medication_id;
                    });
                    expect(medIds).to.include(medication._id);
                    expect(medIds).to.include(otherMedication._id);

                    var patientIds = response.body.schedule.map(function (m) {
                        return m.patient_id;
                    });
                    expect(patientIds.length).to.equal(2);
                    expect(patientIds).to.include(patient._id);
                    expect(patientIds).to.include(otherPatient._id);
                });
            });
        });
    });
});
