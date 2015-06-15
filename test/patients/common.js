"use strict";

var chakram     = require("chakram"),
    mongoose    = require("mongoose"),
    curry       = require("curry"),
    Q           = require("q"),
    auth        = require("../common/auth.js"),
    fixtures    = require("./fixtures.js");

var expect = chakram.expect;

// *must* do this on beforeEach: we may be overriding it on before
module.exports.beforeEach = function () {
    beforeEach(function () {
        // namespacing
        chakram.addProperty("patient", function () {} );

        // verify successful responses
        /*eslint-disable key-spacing */
        var patientSchema = {
            required: ["id", "name", "access", "success"],
            properties: {
                id:     { type: "number" },
                name:   { type: "string" },
                access: { type: "string" }
            }
        };
        /*eslint-enable key-spacing */
        chakram.addProperty("success", function (respObj) {
            expect(respObj).to.be.an.api.getSuccess;
            expect(respObj).to.have.schema(patientSchema);
        });
        chakram.addProperty("createSuccess", function (respObj) {
            expect(respObj).to.be.an.api.postSuccess;
            expect(respObj).to.have.schema(patientSchema);
        });
    });
};

// endpoint should be a function taking (patientId, accessToken)
// we verify it needs a valid patient ID
module.exports.itRequiresValidPatientId = function (endpoint) {
    describe("testing invalid patient IDs", function () {
        // setup test user and store their access token
        var accessToken;
        before(function () {
            return auth.createTestUser().then(function (user) {
                accessToken = user.accessToken;
            });
        });

        it("should not accept invalid patient IDs", function () {
            return expect(endpoint("foobar", accessToken)).to.be.an.api.error(404, "invalid_patient_id");
        });
        it("should not accept patient IDs not corresponding to real patients", function () {
            return expect(endpoint(99999, accessToken)).to.be.an.api.error(404, "invalid_patient_id");
        });
    });
};

// promise-ify Patient.createForUser
var createPatient = function (data, user) {
    var Patient = mongoose.model("Patient");
    return Q.nbind(Patient.createForUser, Patient)(data, user).then(function (patient) {
        patient.user = user;
        return patient;
    });
};

// promise-ify Patient#share
var sharePatient = function (user, access, patient) {
    return Q.nbind(patient.share, patient)(user, access);
};

// create a test patient for the current user
var createMyPatient = module.exports.createMyPatient = curry(function (data, user) {
    return fixtures.build("Patient", data).then(function (patientData) {
        return createPatient(patientData, user);
    });
});

// create a test patient for another user and share with the current
var createOtherPatient = module.exports.createOtherPatient = curry(function (data, access, me, other) {
    return createMyPatient(data, other).then(curry(sharePatient)(me)(access)).then(function (patient) {
        // store me in patient
        patient.user = me;
        return patient;
    });
});

// setup a test user and patient (with specified data modifications to the factory
// default) for that user, and then do something to it
module.exports.testMyPatient = function (data) {
    return auth.createTestUser().then(createMyPatient(data));
};

// setup two test users ('me' + 'other') and patient (with specified data modifications to
// the factory default) for the other user, and share it with the current user with
// the specified access level and then do something to it (e.g., view it)
module.exports.testOtherPatient = function (data, access) {
    return Q.all([auth.createTestUser(), auth.createTestUser()]).spread(createOtherPatient(data, access));
};

// wrapper around auth.itRequiresAuthentication to generate patient IDs to
// test with
// check access token authentication
module.exports.itRequiresAuthentication = function (endpoint) {
    describe("testing authentication", function () {
        // setup test user and patient, storing patientId
        var patientId;
        before(function () {
            return auth.createTestUser().then(createMyPatient({})).then(function (patient) {
                patientId = patient._id;
            });
        });

        auth.itRequiresAuthentication(curry(endpoint)(patientId));
    });
};

// simple endpoint to show patient
module.exports.show = function (patientId, accessToken) {
    return chakram.get("http://localhost:3000/v1/patients/" + patientId, auth.genAuthHeaders(accessToken));
};

