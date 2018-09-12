"use strict";
var chakram     = require("chakram"),
    curry       = require("curry"),
    Q           = require("q"),
    util        = require("util"),
    auth        = require("../common/auth.js"),
    common      = require("./common.js"),
    patients    = require("../patients/common.js");

var expect = chakram.expect;

describe("Patients", function () {
    describe("Deleting a Share (DELETE /patients/:patientid/shares/:shareid)", function () {
        // setup test user and patient
        var patient;
        beforeEach(function () {
            return patients.testMyPatient({}).then(function (p) {
                patient = p;
            });
        });

        // endpoint to delete a specific share
        var remove = function (shareId, patientId, accessToken) {
            var url = util.format("http://localhost:5000/v1/patients/%d/shares/%d", patientId, shareId);
            return chakram.delete(url, {}, auth.genAuthHeaders(accessToken));
        };
        // given a patient, create a share and then try and remove it
        var removePatientShare = function (data, p) {
            // sensible defaults
            var access = "default";
            var group = "prime";
            var email = "foo@bar.com";
            if ("access" in data) access = data.access;
            if ("group" in data) group = data.group;
            if ("email" in data) email = data.email;

            return Q.nbind(p.createShare, p)(email, access, group).then(function (share) {
                return remove(share._id, p._id, p.user.accessToken);
            });
        };
        var removeAPatientShare = function (data) {
            return removePatientShare(data, patient);
        };

        // check it requires a valid and authenticated/authorized patient and user
        patients.itRequiresAuthentication(curry(remove)(1));
        patients.itRequiresValidPatientId(curry(remove)(1));
        patients.itRequiresOnlyMeAuthorization(curry(removePatientShare)({}));

        // check it requires a valid shareid
        common.itRequiresValidShareId(remove);

        describe("with an existing user", function () {
            // create a new user to share the patient with
            var user;
            before(function () {
                return auth.createTestUser({}).then(function (u) {
                    user = u;
                });
            });

            it("successfully removes a share with them", function () {
                return expect(removeAPatientShare({ email: user.email })).to.be.a.share.success;
            });
        });

        describe("with a nonexistent user", function () {
            it("successfully removes a share with them", function () {
                return expect(removeAPatientShare({ email: "doesntexist@email.com" })).to.be.a.share.success;
            });
        });

        it("does't let the owner remove their share", function () {
            // patient recreated for each test with just the owner share
            var endpoint = remove(patient.shares[0]._id, patient._id, patient.user.accessToken);
            return expect(endpoint).to.be.an.api.error(400, "is_owner");
        });
    });
});
