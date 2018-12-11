"use strict";
var chakram     = require("chakram"),
    Q           = require("q"),
    view        = require("./view_patient_test.js"),
    curry       = require("curry"),
    auth        = require("../common/auth.js"),
    common      = require("./common.js");

var expect = chakram.expect;

describe("Patients", function () {
    describe("Update Single Patient (PUT /patients/:patientid)", function () {
        // simple endpoint
        var edit = function (data, patientId, accessToken) {
            var headers = auth.genAuthHeaders(accessToken);
            return chakram.put("http://localhost:5000/v1/patients/" + patientId, data, headers);
        };

        // given a patient and user, try and edit the user
        var editPatient = function (modifications, patient) {
            return edit(modifications, patient._id, patient.user.accessToken);
        };

        // helpers to create patients before removing them
        var editAPatient = function (data, modifications) {
            return common.testMyPatient(data).then(curry(editPatient)(modifications));
        };

        common.itRequiresAuthentication(curry(edit)({}));
        common.itRequiresValidPatientId(curry(edit)({}));
        common.itRequiresWriteAuthorization(curry(editPatient)({}));

        // validations
        it("allows a valid first name", function () {
            return expect(editAPatient({}, { first_name: "newname" })).to.be.a.patient.success;
        });
        it("rejects a blank first name", function () {
            return expect(editAPatient({}, { first_name: "" })).to.be.an.api.error(400, "first_name_required");
        });
        it("rejects a null first name", function () {
            return expect(editAPatient({}, { first_name: null })).to.be.an.api.error(400, "first_name_required");
        });
        it("accepts a valid last name", function () {
            return expect(editAPatient({}, { last_name: "newname" })).to.be.a.patient.success;
        });
        it("accepts a blank last name", function () {
            return expect(editAPatient({}, { last_name: "" })).to.be.a.patient.success;
        });
        it("accepts a null last name to reset to blank", function () {
            return editAPatient({}, { last_name: null }).then(function (response) {
                expect(response).to.be.a.patient.success;
                expect(response.body.last_name).to.equal("");
            });
        });
        it("accepts a valid phone", function () {
            return expect(editAPatient({}, { phone: "newname" })).to.be.a.patient.success;
        });
        it("accepts a blank phone", function () {
            return expect(editAPatient({}, { phone: "" })).to.be.a.patient.success;
        });
        it("accepts a null phone to reset to blank", function () {
            return editAPatient({}, { phone: null }).then(function (response) {
                expect(response).to.be.a.patient.success;
                expect(response.body.phone).to.equal("");
            });
        });
        it("doesn't require any data", function () {
            return expect(editAPatient({}, {})).to.be.a.patient.success;
        });
        it("rejects a blank sex", function () {
            return expect(editAPatient({}, { sex: "" })).to.be.an.api.error(400, "invalid_sex");
        });
        it("rejects an invalid sex", function () {
            return expect(editAPatient({}, { sex: "foo" })).to.be.an.api.error(400, "invalid_sex");
        });
        it("accepts a valid sex", function () {
            return expect(editAPatient({}, { sex: "male" })).to.be.a.patient.success;
        });
        it("rejects a blank birthdate", function () {
            return expect(editAPatient({}, { birthdate: "" })).to.be.an.api.error(400, "invalid_birthdate");
        });
        it("rejects an invalid birthdate", function () {
            return expect(editAPatient({}, { birthdate: "foo" })).to.be.an.api.error(400, "invalid_birthdate");
        });
        it("accepts a valid birthdate", function () {
            return expect(editAPatient({}, { birthdate: "1995-01-01" })).to.be.a.patient.success;
        });

        it("doesn't let a user change the creator (silently fails)", function () {
            return editAPatient({}, { creator: "new@creator.com" }).then(function (response) {
                expect(response).to.be.a.patient.success;
                expect(response.body.creator).to.not.equal("new@creator.com");
            });
        });

        it("doesn't let the owner change their group", function () {
            return expect(editAPatient({}, { group: "prime" })).to.be.an.api.error(400, "is_owner");
        });
        it("doesn't let the owner change their access level to read-only", function () {
            return expect(editAPatient({}, { access: "read" })).to.be.an.api.error(400, "is_owner");
        });
        it("doesn't let the owner remove their access", function () {
            return expect(editAPatient({}, { access: "none" })).to.be.an.api.error(400, "is_owner");
        });
        describe("with a patient shared with me with write access", function () {
            var patient;
            beforeEach(function () {
                // create a patient
                return Q.all([auth.createTestUser(undefined, true), auth.createTestUser(undefined, true)])
                    .spread(common.createOtherPatient({}))
                    .then(function (p) {
                        patient = p;
                        // share the patient
                        // prime defaults to write ability
                        return Q.nbind(patient.share, patient)(patient.user.email, "write", "prime");
                    });
            });

            it("lets me change their group to prime", function () {
                return expect(editPatient({ group: "prime" }, patient)).to.be.a.patient.success;
            });
            it("lets me change their group to family", function () {
                return expect(editPatient({ group: "family" }, patient)).to.be.a.patient.success;
            });
            it("lets me change their group to anyone", function () {
                return expect(editPatient({ group: "anyone" }, patient)).to.be.a.patient.success;
            });
            it("doesn't let me change their group to owner", function () {
                return expect(editPatient({ group: "owner" }, patient)).to.be.an.api.error(400, "invalid_group");
            });
            it("doesn't let me change their group an invalid group", function () {
                return expect(editPatient({ group: "foo" }, patient)).to.be.an.api.error(400, "invalid_group");
            });
            it("doesn't let me change their group to blank", function () {
                return expect(editPatient({ group: "" }, patient)).to.be.an.api.error(400, "invalid_group");
            });
            it("doesn't let me change their group to null", function () {
                return expect(editPatient({ group: null }, patient)).to.be.an.api.error(400, "invalid_group");
            });

            it("lets me explicitly set their access level to read", function () {
                return editPatient({ access: "read" }, patient).then(function (response) {
                    expect(response).to.be.a.patient.success;
                    expect(response.body.access).to.equal("read");
                    // should have read access now but not write access
                    expect(view.showPatient(patient)).to.be.a.patient.success;
                    expect(editPatient({}, patient)).to.be.an.api.error(403, "unauthorized");
                    return chakram.wait();
                });
            });
            it("lets me explicitly set their access level to write", function () {
                return editPatient({ access: "write" }, patient).then(function (response) {
                    expect(response).to.be.a.patient.success;
                    expect(response.body.access).to.equal("write");
                    // should have read and write access still
                    expect(view.showPatient(patient)).to.be.a.patient.success;
                    expect(editPatient({}, patient)).to.be.a.patient.success;
                    return chakram.wait();
                });
            });
            it("lets me explicitly set their access level to none", function () {
                return editPatient({ access: "none" }, patient).then(function (response) {
                    expect(response).to.be.a.patient.success;
                    expect(response.body.access).to.equal("none");
                    // should no longer have read or write access
                    expect(view.showPatient(patient)).to.be.an.api.error(403, "unauthorized");
                    expect(editPatient({}, patient)).to.be.an.api.error(403, "unauthorized");
                    return chakram.wait();
                });
            });
            it("lets me explicitly set their access level to default", function () {
                return editPatient({ access: "default" }, patient).then(function (response) {
                    expect(response).to.be.a.patient.success;
                    // bubbling up to patient permissions: prime = write
                    expect(response.body.access).to.equal("write");
                    // should have read and write access still
                    expect(view.showPatient(patient)).to.be.a.patient.success;
                    expect(editPatient({}, patient)).to.be.a.patient.success;
                    return chakram.wait();
                });
            });
            it("doesn't let me change their access level to an invalid value", function () {
                return expect(editPatient({ access: "foo" }, patient)).to.be.an.api.error(400, "invalid_access");
            });
            it("doesn't let me change their access level to blank", function () {
                return expect(editPatient({ access: "" }, patient)).to.be.an.api.error(400, "invalid_access");
            });
            it("doesn't let me change their access level to null", function () {
                return expect(editPatient({ access: null }, patient)).to.be.an.api.error(400, "invalid_access");
            });
        });

        // patient-wide access levels
        it("lets me set the 'anyone' access level to a valid value", function () {
            return expect(editAPatient({}, {
                access_anyone: "read"
            })).to.be.a.patient.success;
        });
        it("doesn't let me set the 'anyone' access level to null", function () {
            return expect(editAPatient({}, {
                access_anyone: null
            })).to.be.an.api.error(400, "invalid_access_anyone");
        });
        it("doesn't let me set the 'anyone' access level to blank", function () {
            return expect(editAPatient({}, {
                access_anyone: ""
            })).to.be.an.api.error(400, "invalid_access_anyone");
        });
        it("doesn't let me set the 'anyone' access level to an invalid value", function () {
            return expect(editAPatient({}, {
                access_anyone: "foo"
            })).to.be.an.api.error(400, "invalid_access_anyone");
        });
        it("lets me set the 'family' access level to a valid value", function () {
            return expect(editAPatient({}, {
                access_family: "read"
            })).to.be.a.patient.success;
        });
        it("doesn't let me set the 'family' access level to null", function () {
            return expect(editAPatient({}, {
                access_family: null
            })).to.be.an.api.error(400, "invalid_access_family");
        });
        it("doesn't let me set the 'family' access level to blank", function () {
            return expect(editAPatient({}, {
                access_family: ""
            })).to.be.an.api.error(400, "invalid_access_family");
        });
        it("doesn't let me set the 'family' access level to an invalid value", function () {
            return expect(editAPatient({}, {
                access_family: "foo"
            })).to.be.an.api.error(400, "invalid_access_family");
        });
        it("lets me set the 'prime' access level to a valid value", function () {
            return expect(editAPatient({}, {
                access_prime: "read"
            })).to.be.a.patient.success;
        });
        it("doesn't let me set the 'prime' access level to null", function () {
            return expect(editAPatient({}, {
                access_prime: null
            })).to.be.an.api.error(400, "invalid_access_prime");
        });
        it("doesn't let me set the 'prime' access level to blank", function () {
            return expect(editAPatient({}, {
                access_prime: ""
            })).to.be.an.api.error(400, "invalid_access_prime");
        });
        it("doesn't let me set the 'prime' access level to an invalid value", function () {
            return expect(editAPatient({}, {
                access_prime: "foo"
            })).to.be.an.api.error(400, "invalid_access_prime");
        });
    });
});
