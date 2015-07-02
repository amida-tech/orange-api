"use strict";
var chakram     = require("chakram"),
    curry       = require("curry"),
    Q           = require("q"),
    util        = require("util"),
    auth        = require("../common/auth.js"),
    common      = require("./common.js"),
    patients    = require("../patients/common.js"),
    fixtures    = require("../users/fixtures.js");

var expect = chakram.expect;

describe("Patients", function () {
    describe("Listing All Shares (GET /patients/:patientid/shares)", function () {
        // setup test user and patient, and share with another existing user
        // as well as a non-existent user
        var patient;
        before(function () {
            return patients.testMyPatient({}).then(function (p) {
                patient = p;
            });
        });

        // endpoint to view all shares
        var list = function () {
            var url = util.format("http://localhost:3000/v1/patients/%d/shares", patient._id);
            return chakram.get(url, auth.genAuthHeaders(patient.user.accessToken));
        };

        it("successfully returns shares", function () {
            return expect(list()).to.be.a.share.listSuccess;
        });

        it("initially shows an owner share", function () {
            return list().then(function (response) {
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

            it("should show the new share", function () {
                return list().then(function (response) {
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

            it("should show the new share", function () {
                return list().then(function (response) {
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
    });
});
