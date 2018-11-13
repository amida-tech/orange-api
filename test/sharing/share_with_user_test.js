"use strict";
var chakram     = require("chakram"),
    curry       = require("curry"),
    extend      = require("xtend"),
    util        = require("util"),
    auth        = require("../common/auth.js"),
    patients    = require("../patients/common.js"),
    fixtures    = require("../users/fixtures.js");

var expect = chakram.expect;

describe("Patients", function () {
    describe("Share Patient with User (POST /patients/:patientid/shares)", function () {
        // share the passed patient with a user (user specified in data)
        var share = function (data, patientId, accessToken) {
            var url = util.format("http://localhost:5000/v1/patients/%d/shares", patientId);
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
            return auth.createTestUser(undefined, true).then(function (user) {
                return sharePatient(extend({
                    email: user.email
                }, data), patient);
            });
        };
        // create a test user and patient and then do sharePatientWithExisting
        var shareAPatientWithExisting = function (data) {
            return patients.testMyPatient({}).then(curry(sharePatientWithExisting)(data));
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
            })).to.be.an.api.error(400, "invalid_group");
        });
        it("rejects a null group", function () {
            return expect(shareAPatientWithExisting({
                group: null
            })).to.be.an.api.error(400, "invalid_group");
        });
        it("rejects a blank group", function () {
            return expect(shareAPatientWithExisting({
                group: ""
            })).to.be.an.api.error(400, "invalid_group");
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
            })).to.be.an.api.error(400, "invalid_access");
        });
        it("rejects a null access level", function () {
            return expect(shareAPatientWithExisting({
                access: null
            })).to.be.an.api.error(400, "invalid_access");
        });
        it("rejects a blank access level", function () {
            return expect(shareAPatientWithExisting({
                access: ""
            })).to.be.an.api.error(400, "invalid_access");
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
        it("accepts a valid default access level", function () {
            return expect(shareAPatientWithExisting({
                access: "default"
            })).to.be.a.share.createSuccess;
        });

        it("lets me share with an existing user", function () {
            return shareAPatientWithExisting().then(function (response) {
                expect(response).to.be.a.share.createSuccess;
                expect(response.body.is_user).to.be.true;
            });
        });

        describe("sharing with a user who doesn't exist yet", function () {
            var patient, shareId;

            it("lets me share with them initially", function () {
                return patients.testMyPatient({}).then(function (p) {
                    patient = p;
                    return sharePatient({
                        email: "not.a@currentuser.com"
                    }, patient);
                }).then(function (response) {
                    expect(response).to.be.a.share.createSuccess;
                    expect(response.body.is_user).to.be.false;
                    shareId = response.body.id;
                });
            });

            describe("after the user is created", function () {
                // create user
                before(function () {
                    return fixtures.create("User", {
                        email: "not.a@currentuser.com"
                    });
                });

                it("shows that the user now exists", function () {
                    // no view endpoint, so we hackishly use the edit one
                    var url = util.format("http://localhost:5000/v1/patients/%d/shares/%d", patient._id, shareId);
                    var headers = auth.genAuthHeaders(patient.user.accessToken);
                    return chakram.put(url, {}, headers).then(function (response) {
                        expect(response).to.be.a.share.success;
                        expect(response.body.is_user).to.be.true;
                    });
                });
            });
        });
    });
});
