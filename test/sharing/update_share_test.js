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

        it("modifies access permissions and group", function () {
            return updateAPatientShare({
                access: "default",
                group: "prime"
            }, {
                access: "write",
                group: "anyone"
            }).then(function (response) {
                expect(response).to.be.a.share.success;
                expect(response.body.access).to.equal("write");
                expect(response.body.group).to.equal("anyone");
            });
        });

        it("actually updates access permissions");
    });
});
