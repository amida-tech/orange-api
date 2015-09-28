"use strict";
var chakram     = require("chakram"),
    util        = require("util"),
    auth        = require("../common/auth.js"),
    patients    = require("../patients/common.js");

var expect = chakram.expect;

// all logic is tested in detail in the schedule unit tests, here we just check everything
// is being called as it should be

describe("Schedule", function () {
    describe("Show Patient Schedule (GET /patients/:patientid/schedule)", function () {
        // show a medication
        var showMedication = function (medicationId, patientId, accessToken) {
            var url = util.format("http://localhost:5000/v1/patients/%d/medications/%d", patientId, medicationId);
            return chakram.get(url, auth.genAuthHeaders(accessToken));
        };

        // create a medication
        var createMedication = function (data, patientId, accessToken) {
            var url = util.format("http://localhost:5000/v1/patients/%d/medications", patientId);
            return chakram.post(url, data, auth.genAuthHeaders(accessToken));
        };

        // given some schedule data, create a patient with medication for it and then try and show the medication
        // returns the response from both the med create and show endpoints
        var showSchedule = function (schedule) {
            return patients.testMyPatient({}).then(function (patient) {
                var create = createMedication({
                    name: "foobar",
                    schedule: schedule
                }, patient._id, patient.user.accessToken);
                return create.then(function (createResponse) {
                    var show = showMedication(createResponse.body.id, patient._id, patient.user.accessToken);
                    return show.then(function (showResponse) {
                        return [createResponse, showResponse];
                    });
                });
            });
        };

        // authorization etc tested elsewhere in medications e2e tests

        it("rejects invalid schedules", function () {
            return showSchedule({
                foo: "bar"
            }).spread(function (createResponse) {
                expect(createResponse).to.be.an.api.error(400, "invalid_schedule");
            });
        });

        it("stores and retrieves schedules successfully", function () {
            var schedule = {
                as_needed: false,
                regularly: true,
                until: { type: "forever" },
                frequency: { n: 1, unit: "day" },
                times: [{ id: 9997, type: "unspecified" }],
                take_with_food: null,
                take_with_medications: [],
                take_without_medications: []
            };

            return showSchedule(schedule).spread(function (createResponse, showResponse) {
                // successful responses
                expect(createResponse).to.be.a.medication.createSuccess;
                expect(showResponse).to.be.a.medication.viewSuccess;

                // should silently ignore id we passed on time field
                expect(createResponse.body.schedule.times[0].id).to.be.a("number");
                expect(createResponse.body.schedule.times[0].id).to.not.equal(9997);

                // schedule returned as expected
                // this tests time IDs are consistent as well
                expect(createResponse.body.schedule).to.deep.equal(showResponse.body.schedule);
                var s = showResponse.body.schedule;
                s.times = s.times.filter(function (time) {
                    delete time.id;
                    return time;
                });
                schedule.times = schedule.times.filter(function (time) {
                    delete time.id;
                    return time;
                });
                expect(s).to.deep.equal(schedule);

            });
        });
    });
});
