"use strict";
var chakram     = require("chakram"),
    curry       = require("curry"),
    extend      = require("xtend"),
    util        = require("util"),
    auth        = require("../common/auth.js"),
    common      = require("./common.js"),
    patients    = require("../patients/common.js"),
    fixtures    = require("../users/fixtures.js");

var expect = chakram.expect;

describe("Patients", function () {
    describe("Share Patient with User (POST /patients/:patientid/shared)", function () {
        // share the passed patient with a user (user specified in data)
        var share = function (data, patientId, accessToken) {
            var url = util.format("http://localhost:3000/v1/patients/%d/shared", patientId);
            return chakram.post(url, data, auth.genAuthHeaders(accessToken));
        };
        // data is extended with sensible defaults
        var sharePatient = function (data, patient) {
            return share(extend({
                access: "default",
                group: "anyone"
            }, data), patient._id, patient.user.accessToken);
        };
        // create a new user and try and share the patient with them
        // data is extended with the user's email address
        var sharePatientWithExisting = function (data, patient) {
            return auth.createTestUser().then(function (user) {
                return sharePatient(extend({
                    email: user.email
                }, data), patient);
            });
        };
        // create a test user and patient and then do sharePatientWithExisting
        var shareAPatientWithExisting = function (data) {
            return patients.testMyPatient({}).then(curry(sharePatientWithExisting)(data));
        };
        // likewise for sharePatient
        var shareAPatient = function (data) {
            return patients.testMyPatient({}).then(curry(sharePatient)(data));
        };

        // check it rqeuires a valid and authenticated/authorized patient and user
        patients.itRequiresAuthentication(curry(share)({}));
        patients.itRequiresValidPatientId(curry(share)({}));
        patients.itRequiresWriteAuthorization(curry(sharePatientWithExisting)({}));

        // check a valid email address is required
        it("requires an email address", function () {
            return expect(shareAPatientWithExisting({
                email: undefined
            })).to.be.an.api.error(400, "email_required");
        });
        it("rejects a null email address", function () {
            return expect(shareAPatientWithExisting({
                email: null
            })).to.be.an.api.error(400, "email_required");
        });
        it("rejects a blank email address", function () {
            return expect(shareAPatientWithExisting({
                email: ""
            })).to.be.an.api.error(400, "email_required");
        });
        it("rejects an invalid email address", function () {
            return expect(shareAPatientWithExisting({
                email: "foobarnotanemail!!!"
            })).to.be.an.api.error(400, "invalid_email");
        });
        it("accepts a valid email address", function () {
            return expect(shareAPatientWithExisting({
                email: "foo@bar.com"
            })).to.be.a.share.createSuccess;
        });

        // check a valid group is required
        it("requires a group", function () {
            return expect(shareAPatientWithExisting({
                group: undefined
            })).to.be.an.api.error(400, "group_required");
        });
        it("rejects a null group", function () {
            return expect(shareAPatientWithExisting({
                group: null
            })).to.be.an.api.error(400, "group_required");
        });
        it("rejects a blank group", function () {
            return expect(shareAPatientWithExisting({
                group: ""
            })).to.be.an.api.error(400, "group_required");
        });
        it("rejects an invalid group", function () {
            return expect(shareAPatientWithExisting({
                group: "foo"
            })).to.be.an.api.error(400, "invalid_group");
        });
        it("rejects group being owner", function () {
            return expect(shareAPatientWithExisting({
                group: "owner"
            })).to.be.an.api.error(400, "invalid_group");
        });
        it("accepts a valid group", function () {
            return expect(shareAPatientWithExisting({
                group: "anyone"
            })).to.be.a.share.createSuccess;
        });

        // check a valid access level (read/write/default is required)
        it("requires an access level", function () {
            return expect(shareAPatientWithExisting({
                access: undefined
            })).to.be.an.api.error(400, "access_required");
        });
        it("rejects a null access level", function () {
            return expect(shareAPatientWithExisting({
                access: null
            })).to.be.an.api.error(400, "access_required");
        });
        it("rejects a blank access level", function () {
            return expect(shareAPatientWithExisting({
                access: ""
            })).to.be.an.api.error(400, "access_required");
        });
        it("rejects an invalid access level", function () {
            return expect(shareAPatientWithExisting({
                access: "foo"
            })).to.be.an.api.error(400, "invalid_access");
        });
        it("accepts a valid access level", function () {
            return expect(shareAPatientWithExisting({
                access: "read"
            })).to.be.a.share.createSuccess;
        });

        it("lets me share with an existing user", function () {
            return shareAPatientWithExisting().then(function (response) {
                expect(response).to.be.a.share.createSuccess;
                expect(response.body.is_user).to.be.true;
            });
        });

        describe("sharing with a user who doesn't exist yet", function () {
            it("lets me share with them initially", function () {
                return shareAPatient({
                    email: "not.a@currentuser.com"
                }).then(function (response) {
                    expect(response).to.be.a.share.createSuccess;
                    expect(response.body.is_user).to.be.false;
                });
            });

            describe("after the user is created", function () {
                // create user
                before(function () {
                    return fixtures.create("User", {
                        email: "not.a@currentuser.com"
                    });
                });

                // TODO: implement once view endpoint is implemented
                it("show that the user now exists");
            });
        });
    });
});
