"use strict";
var chakram     = require("chakram"),
    curry       = require("curry"),
    Q           = require("q"),
    util        = require("util"),
    auth        = require("../common/auth.js"),
    patients    = require("../patients/common.js");

var expect = chakram.expect;

describe("Patients", function () {
    describe("Updating a Share (PUT /patients/:patientid/shares/:shareid)", function () {
        // endpoint to modify a specific share
        var update = function (modifications, shareId, patientId, accessToken) {
            var url = util.format("http://localhost:3000/v1/patients/%d/shares/%d", patientId, shareId);
            return chakram.put(url, modifications, auth.genAuthHeaders(accessToken));
        };
        // given a patient, create a share and then try and remove it
        var updatePatientShare = function (modifications, data, patient) {
            // sensible defaults
            var access = "default";
            var group = "prime";
            var email = "foo@bar.com";
            if ("access" in data) access = data.access;
            if ("group" in data) group = data.group;
            if ("email" in data) email = data.email;

            return Q.nbind(patient.createShare, patient)(email, access, group).then(function (share) {
                return update(modifications, share._id, patient._id, patient.user.accessToken);
            });
        };
        // create a patient and share, and then try and remove the share
        var updateAPatientShare = function (data, modifications) {
            return patients.testMyPatient({}).then(curry(updatePatientShare)(modifications, data));
        };

        // check it rqeuires a valid and authenticated/authorized patient and user
        patients.itRequiresAuthentication(curry(update)({}, 1));
        patients.itRequiresValidPatientId(curry(update)({}, 1));
        patients.itRequiresWriteAuthorization(curry(updatePatientShare)({}, {}));

        it("doesn't modify email", function () {
            return updateAPatientShare({}, {
                email: "new@email.com"
            }).then(function (response) {
                expect(response).to.be.a.share.success;
                expect(response.body.email).not.to.equal("new@email.com");
            });
        });

        it("allows access to be changed to read", function () {
            return updateAPatientShare({}, {
                access: "read"
            }).then(function (response) {
                expect(response).to.be.a.share.success;
                expect(response.body.access).to.equal("read");
            });
        });
        it("allows access to be changed to write", function () {
            return updateAPatientShare({}, {
                access: "read"
            }).then(function (response) {
                expect(response).to.be.a.share.success;
                expect(response.body.access).to.equal("read");
            });
        });
        it("allows access to be changed to default and shows default", function () {
            return updateAPatientShare({}, {
                access: "default"
            }).then(function (response) {
                expect(response).to.be.a.share.success;
                expect(response.body.access).to.equal("default");
            });
        });
        it("doesn't allow access to be changed to null", function () {
            return expect(updateAPatientShare({}, {
                access: null
            })).to.be.an.api.error(400, "invalid_access");
        });
        it("doesn't allow access to be changed to blank", function () {
            return expect(updateAPatientShare({}, {
                access: ""
            })).to.be.an.api.error(400, "invalid_access");
        });
        it("doesn't allow access to be changed to an invalid value", function () {
            return expect(updateAPatientShare({}, {
                access: "foo"
            })).to.be.an.api.error(400, "invalid_access");
        });

        it("allows group to be changed to a valid value", function () {
            return expect(updateAPatientShare({}, {
                group: "prime"
            })).to.be.a.share.success;
        });
        it("doens't allow group to be changed to owner", function () {
            return expect(updateAPatientShare({}, {
                group: "owner"
            })).to.be.an.api.error(400, "invalid_group");
        });
        it("doens't allow group to be changed to an invalid value", function () {
            return expect(updateAPatientShare({}, {
                group: "foo"
            })).to.be.an.api.error(400, "invalid_group");
        });
        it("doens't allow group to be changed to a null", function () {
            return expect(updateAPatientShare({}, {
                group: null
            })).to.be.an.api.error(400, "invalid_group");
        });
        it("doens't allow group to be changed to blank", function () {
            return expect(updateAPatientShare({}, {
                group: ""
            })).to.be.an.api.error(400, "invalid_group");
        });

        describe("with owner share", function () {
            // setup patient with owner share only
            var patient;
            before(function () {
                return patients.testMyPatient({}).then(function (p) {
                    patient = p;
                });
            });

            it("doesn't allow the owner to modify access", function () {
                var endpoint = update({
                    access: "read"
                }, patient.shares[0]._id, patient._id, patient.user.accessToken);
                return expect(endpoint).to.be.an.api.error(400, "is_owner");
            });
            it("doesn't allow the owner to modify group", function () {
                var endpoint = update({
                    group: "prime"
                }, patient.shares[0]._id, patient._id, patient.user.accessToken);
                return expect(endpoint).to.be.an.api.error(400, "is_owner");
            });
        });
    });
});
