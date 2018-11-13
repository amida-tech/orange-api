"use strict";
var chakram     = require("chakram"),
    mongoose    = require("mongoose"),
    Q           = require("q"),
    auth        = require("../../common/auth.js"),
    common      = require("../common.js");

var expect = chakram.expect;

describe("Patients", function () {
    describe("Remove User (Cascade Delete)", function () {
        // create a user (me) and a user to share patients with
        var me, otherUser;
        before(function () {
            return auth.createTestUser(undefined, true).then(function (u) {
                me = u;
            });
        });
        before(function () {
            return auth.createTestUser(undefined, true).then(function (u) {
                otherUser = u;
            });
        });

        // create two patients, one shared with the other user and one
        // not
        var patient, sharedPatient;
        before(function () {
            return common.createMyPatient({}, me).then(function (p) {
                patient = p;
            });
        });
        before(function () {
            return common.createMyPatient({}, me).then(function (p) {
                sharedPatient = p;
                return Q.npost(p, "share", [otherUser.email, "default", "prime"]);
            });
        });

        // remove the original user
        before(function () {
            return Q.npost(me, "remove");
        });

        it("removed the patient shared only with me", function () {
            return Q.npost(mongoose.model("Patient"), "findOne", [{_id: patient.id}]).then(function (p) {
                expect(p).to.be.null;
            });
        });

        it("only removed my share from the patient shared with another user", function () {
            return Q.npost(mongoose.model("Patient"), "findOne", [{_id: sharedPatient.id}]).then(function (p) {
                expect(p).to.not.be.null;
                expect(p.shares.length).to.equal(1);
            });
        });
    });
});
