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
    var show = function (timeId, medicationId, patientId, accessToken) {
        var url = util.format("http://localhost:3000/v1/patients/%d/medications/%d/times/%d", patientId, medicationId, timeId);
        return chakram.get(url, auth.genAuthHeaders(accessToken));
    };
    var update = function (data, timeId, medicationId, patientId, accessToken) {
        var url = util.format("http://localhost:3000/v1/patients/%d/medications/%d/times/%d", patientId, medicationId, timeId);
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
    });

    /*
    describe("Lifecycle", function () {
        it("initially shows a sensible global default and no user-specific default", function () {
            return
        });
    });
    */
});
