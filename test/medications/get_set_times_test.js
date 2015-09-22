"use strict";
var chakram     = require("chakram"),
    curry       = require("curry"),
    Q           = require("q"),
    util        = require("util"),
    auth        = require("../common/auth.js"),
    common      = require("./common.js"),
    patients    = require("../patients/common.js");

var expect = chakram.expect;

describe("Medication Time Notification Settings", function () {
    // get/set notification settings
    var show = function (tId, mId, pId, accessToken) {
        var url = util.format("http://localhost:3000/v1/patients/%d/medications/%d/times/%d", pId, mId, tId);
        return chakram.get(url, auth.genAuthHeaders(accessToken));
    };
    var update = function (data, tId, mId, pId, accessToken) {
        var url = util.format("http://localhost:3000/v1/patients/%d/medications/%d/times/%d", pId, mId, tId);
        return chakram.put(url, data, auth.genAuthHeaders(accessToken));
    };

    // setup test users
    var me, otherUser;
    before(function () {
        return auth.createTestUser().then(function (u) {
            me = u;
        });
    });
    before(function () {
        return auth.createTestUser().then(function (u) {
            otherUser = u;
        });
    });

    // setup test patient accessible by both users
    var patient;
    before(function () {
        return patients.createMyPatient({}, me).then(function (p) {
            patient = p;
        }).then(function () {
            return Q.nbind(patient.share, patient)(otherUser.email, "write", "prime");
        });
    });

    // setup test medication with a time for that patient
    var medication;
    before(function () {
        return Q.nbind(patient.createMedication, patient)({
            name: "testmed",
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
            medication = m;
        });
    });

    // helper functions to show/update notification settings for this specific time
    var showTime = function () {
        return show(medication.schedule.times[0].id, medication._id, patient._id, me.accessToken);
    };
    var showOtherTime = function () {
        return show(medication.schedule.times[0].id, medication._id, patient._id, otherUser.accessToken);
    };
    var updateTime = function (data) {
        return update(data, medication.schedule.times[0].id, medication._id, patient._id, me.accessToken);
    };

    describe("Lifecycle", function () {
        it("initially shows a sensible global default and no user-specific default", function () {
            return showTime().then(function (response) {
                expect(response).to.be.a.notifications.success;
                // docs specify this must be 30 mins
                expect(response.body.default).to.equal(30);
                expect(response.body.user).to.equal("default");
            });
        });

        it("lets me update just the global default", function () {
            return updateTime({
                default: 15
            }).then(function (response) {
                expect(response).to.be.a.notifications.success;
                expect(response.body.default).to.equal(15);
                expect(response.body.user).to.equal("default");
            });
        });

        it("shows an updated global default", function () {
            return showTime().then(function (response) {
                expect(response).to.be.a.notifications.success;
                expect(response.body.default).to.equal(15);
                expect(response.body.user).to.equal("default");
            });
        });

        it("updates the global default for the other user", function () {
            return showOtherTime().then(function (response) {
                expect(response).to.be.a.notifications.success;
                expect(response.body.default).to.equal(15);
                expect(response.body.user).to.equal("default");
            });
        });

        it("lets me update my user specific time", function () {
            return updateTime({
                user: 10
            }).then(function (response) {
                expect(response).to.be.a.notifications.success;
                expect(response.body.default).to.equal(15);
                expect(response.body.user).to.equal(10);
            });
        });

        it("shows an updated user time for me", function () {
            return showTime().then(function (response) {
                expect(response).to.be.a.notifications.success;
                expect(response.body.default).to.equal(15);
                expect(response.body.user).to.equal(10);
            });
        });

        it("still shows a default user time for the other user", function () {
            return showOtherTime().then(function (response) {
                expect(response).to.be.a.notifications.success;
                expect(response.body.default).to.equal(15);
                expect(response.body.user).to.equal("default");
            });
        });

        it("lets me change my user time back to default and change the default", function () {
            return updateTime({
                user: "default",
                default: 5
            }).then(function (response) {
                expect(response).to.be.a.notifications.success;
                expect(response.body.default).to.equal(5);
                expect(response.body.user).to.equal("default");
            });
        });

        it("shows a default user time for me again", function () {
            return showTime().then(function (response) {
                expect(response).to.be.a.notifications.success;
                expect(response.body.default).to.equal(5);
                expect(response.body.user).to.equal("default");
            });
        });

        it("shows a default user time for the other user still", function () {
            return showOtherTime().then(function (response) {
                expect(response).to.be.a.notifications.success;
                expect(response.body.default).to.equal(5);
                expect(response.body.user).to.equal("default");
            });
        });

        it("lets me pause my user time", function () {
            return updateTime({
                user: "paused"
            }).then(function (response) {
                expect(response).to.be.a.notifications.success;
                expect(response.body.default).to.equal(5);
                expect(response.body.user).to.equal("paused");
            });
        });

        it("shows my time as paused", function () {
            return showTime().then(function (response) {
                expect(response).to.be.a.notifications.success;
                expect(response.body.default).to.equal(5);
                expect(response.body.user).to.equal("paused");
            });
        });

        it("shows a default user time for the other user still", function () {
            return showOtherTime().then(function (response) {
                expect(response).to.be.a.notifications.success;
                expect(response.body.default).to.equal(5);
                expect(response.body.user).to.equal("default");
            });
        });

        it("lets me pause the time for everyone", function () {
            return updateTime({
                user: "default",
                default: "paused"
            }).then(function (response) {
                expect(response).to.be.a.notifications.success;
                expect(response.body.default).to.equal("paused");
                expect(response.body.user).to.equal("default");
            });
        });

        it("shows a paused user time for me again", function () {
            return showTime().then(function (response) {
                expect(response).to.be.a.notifications.success;
                expect(response.body.default).to.equal("paused");
                expect(response.body.user).to.equal("default");
            });
        });

        it("shows a paused user time for the other user still", function () {
            return showOtherTime().then(function (response) {
                expect(response).to.be.a.notifications.success;
                expect(response.body.default).to.equal("paused");
                expect(response.body.user).to.equal("default");
            });
        });

        it("lets me pause the time for everyone but me", function () {
            return updateTime({
                user: 5,
                default: "paused"
            }).then(function (response) {
                expect(response).to.be.a.notifications.success;
                expect(response.body.default).to.equal("paused");
                expect(response.body.user).to.equal(5);
            });
        });

        it("shows a paused user time for me again", function () {
            return showTime().then(function (response) {
                expect(response).to.be.a.notifications.success;
                expect(response.body.default).to.equal("paused");
                expect(response.body.user).to.equal(5);
            });
        });

        it("shows a paused user time for the other user still", function () {
            return showOtherTime().then(function (response) {
                expect(response).to.be.a.notifications.success;
                expect(response.body.default).to.equal("paused");
                expect(response.body.user).to.equal("default");
            });
        });

    });

    describe("Viewing Notification Settings (GET /patients/:patientid/medications/:medid/times/:timeid)", function () {
        // check it requires a valid authenticated patient
        patients.itRequiresAuthentication(curry(show)(1, 1));
        patients.itRequiresValidPatientId(curry(show)(1, 1));
        common.itRequiresReadAuthorization(function (p, m) {
            // try and view notification settings for first event time in med
            return show(m.schedule.times[0].id, m._id, p._id, p.user.accessToken);
        });

        it("doesn't accept an invalid time ID", function () {
            var endpoint = show("foo", medication._id, patient._id, patient.user.accessToken);
            return expect(endpoint).to.be.an.api.error(404, "invalid_time_id");
        });
        it("doesn't accept non-existant time IDs", function () {
            var endpoint = show(9999, medication._id, patient._id, patient.user.accessToken);
            return expect(endpoint).to.be.an.api.error(404, "invalid_time_id");
        });
    });

    describe("Updating Notification Settings (PUT /patients/:patientid/medications/:medid/times/:timeid)", function () {
        // check it requires a valid authenticated patient
        patients.itRequiresAuthentication(curry(update)({}, 1, 1));
        patients.itRequiresValidPatientId(curry(update)({}, 1, 1));
        common.itRequiresWriteAuthorization(function (p, m) {
            // try and update notification settings for first event time in med
            return update({}, m.schedule.times[0].id, m._id, p._id, p.user.accessToken);
        });

        it("doesn't accept an invalid time ID", function () {
            var endpoint = update({}, "foo", medication._id, patient._id, patient.user.accessToken);
            return expect(endpoint).to.be.an.api.error(404, "invalid_time_id");
        });
        it("doesn't accept non-existant time IDs", function () {
            var endpoint = update({}, 9999, medication._id, patient._id, patient.user.accessToken);
            return expect(endpoint).to.be.an.api.error(404, "invalid_time_id");
        });

        it("allows no data to be changed", function () {
            return expect(updateTime({})).to.be.a.notifications.success;
        });

        it("rejects a null default value", function () {
            return expect(updateTime({
                default: null
            })).to.be.an.api.error(400, "invalid_default");
        });
        it("rejects a blank default value", function () {
            return expect(updateTime({
                default: ""
            })).to.be.an.api.error(400, "invalid_default");
        });
        it("rejects a non-numeric default value", function () {
            return expect(updateTime({
                default: "foo"
            })).to.be.an.api.error(400, "invalid_default");
        });
        it("allows a positive integer default value", function () {
            return expect(updateTime({
                default: 5
            })).to.be.a.notifications.success;
        });
        it("rejects a negative integer default value", function () {
            return expect(updateTime({
                default: -5
            })).to.be.an.api.error(400, "invalid_default");
        });
        it("rejects a negative float default value", function () {
            return expect(updateTime({
                default: -5.5
            })).to.be.an.api.error(400, "invalid_default");
        });
        it("allows a positive float default value", function () {
            return expect(updateTime({
                default: 5.5
            })).to.be.a.notifications.success;
        });
        it("allows a zero default value", function () {
            return expect(updateTime({
                default: 0
            })).to.be.a.notifications.success;
        });

        it("rejects a null user value", function () {
            return expect(updateTime({
                user: null
            })).to.be.an.api.error(400, "invalid_user");
        });
        it("rejects a blank user value", function () {
            return expect(updateTime({
                user: ""
            })).to.be.an.api.error(400, "invalid_user");
        });
        it("rejects a non-numeric user value", function () {
            return expect(updateTime({
                user: "foo"
            })).to.be.an.api.error(400, "invalid_user");
        });
        it("allows 'default' for a user value", function () {
            return expect(updateTime({
                user: "default"
            })).to.be.a.notifications.success;
        });
        it("allows a positive integer user value", function () {
            return expect(updateTime({
                user: 5
            })).to.be.a.notifications.success;
        });
        it("rejects a negative integer user value", function () {
            return expect(updateTime({
                user: -5
            })).to.be.an.api.error(400, "invalid_user");
        });
        it("rejects a negative float user value", function () {
            return expect(updateTime({
                user: -5.5
            })).to.be.an.api.error(400, "invalid_user");
        });
        it("allows a positive float user value", function () {
            return expect(updateTime({
                user: 5.5
            })).to.be.a.notifications.success;
        });
        it("allows a zero user value", function () {
            return expect(updateTime({
                user: 0
            })).to.be.a.notifications.success;
        });
    });
});
