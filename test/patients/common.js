"use strict";

var chakram     = require("chakram"),
    mongoose    = require("mongoose"),
    curry       = require("curry"),
    Q           = require("q"),
    auth        = require("../common/auth.js"),
    common      = require("../common/chakram.js"),
    fixtures    = require("./fixtures.js");

var expect = chakram.expect;

// verify successful responses
/*eslint-disable key-spacing */
var patientSchema = module.exports.schema = {
    required: ["id", "first_name", "last_name", "sex", "birthdate", "avatar", "access", "group", "access_anyone",
                "access_family", "access_prime", "phone", "creator", "me", "meditations", "success"],
    properties: {
        success:        { type: "boolean" },
        id:             { type: "number" },
        first_name:     { type: "string" },
        last_name:      { type: "string" },
        sex:            { type: "string" },
        avatar:         { type: "string" },
        access:         { type: "string" },
        group:          { type: ["string", "null"] },
        access_anyone:  { type: "string" },
        access_family:  { type: "string" },
        access_prime:   { type: "string" },
        birthdate:      { type: ["string", "null"] },
        phone:          { type: "string" },
        creator:        { type: "string" },
        me:             { type: "boolean" },
        meditations:    {
            type:           "object",
            required:       ["count", "sum"],
            properties:     {
                count:      { type: "number" },
                sum:        { type: "number" }
            }
        }
    },
    additionalProperties: false
};
var avatarSchema = {
    required: ["avatar", "success"],
    properties: {
        success:    { type: "boolean" },
        avatar:     { type: "string" }
    },
    additionalProperties: false
};
/*eslint-enable key-spacing */
common.addApiChain("patient", {
    "createSuccess": function (respObj) {
        expect(respObj).to.be.an.api.postSuccess;
        expect(respObj).to.have.schema(patientSchema);
    },
    "success": function (respObj) {
        expect(respObj).to.be.an.api.getSuccess;
        expect(respObj).to.have.schema(patientSchema);
    },
    "listSuccess": function (respObj) {
        expect(respObj).to.be.an.api.genericListSuccess("patients", patientSchema);
    },
    "dumpSuccess": function (respObj) {
        expect(respObj).to.be.an.api.getSuccess;
        // schema validated in test
    }
});

common.addApiChain("avatar", {
    "imageSuccess": function (respObj) {
        expect(respObj).to.have.status(200);
        expect(respObj).to.have.header("content-type", function (contentType) {
            expect(contentType).to.not.equal("application/json");
        });
    },
    "setSuccess": function (respObj) {
        expect(respObj).to.be.an.api.postSuccess;
        expect(respObj).to.have.schema(avatarSchema);
    }
});

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

        it("rejects invalid patient IDs", function () {
            return expect(endpoint("foobar", accessToken)).to.be.an.api.error(404, "invalid_patient_id");
        });
        it("rejects patient IDs not corresponding to real patients", function () {
            return expect(endpoint(99999, accessToken)).to.be.an.api.error(404, "invalid_patient_id");
        });
    });
};

// promise-ify Patient.createForUser
var createPatient = module.exports.createPatient = function (data, user) {
    var Patient = mongoose.model("Patient");
    return Q.nbind(Patient.createForUser, Patient)(data, user).then(function (patient) {
        patient.user = user;
        return patient;
    });
};

// create a test patient for the current user
var createMyPatient = module.exports.createMyPatient = curry(function (data, user) {
    return fixtures.build("Patient", data).then(function (patientData) {
        return createPatient(patientData, user);
    });
});

// create a test patient for another user
var createOtherPatient = module.exports.createOtherPatient = curry(function (data, me, other) {
    return createMyPatient(data, other).then(function (patient) {
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

// wrapper around auth.itRequiresAuthentication to generate patient IDs to test with
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
    return chakram.get("http://localhost:5000/v1/patients/" + patientId, auth.genAuthHeaders(accessToken));
};

// helper methods for authentication
var testAuthorizationSuccessful = function (endpoint, patient) {
    // if we should have access check success: true was in response
    return expect(endpoint(patient)).to.be.an.api.genericSuccess();
};
var testAuthorizationFailed = function (endpoint, patient) {
    // otherwise check a 403 was returned with the appropriate error slug
    return expect(endpoint(patient)).to.be.an.api.error(403, "unauthorized");
};

// helper methods to check that a resource requires the relevant
// authorization
// endpoint should be a function taking (patient)
var genAuthorizationTest = function (endpoint, levels, successChecker, failChecker) {
    // generate testcase names
    var accessName = function (level, scenario) {
        if (level) return "it gives me access to " + scenario;
        else return "it denies me access to " + scenario;
    };

    // generate entire testcase
    return function (slug, scenario, patientPromiseGetter) {
        it(accessName(levels[slug], scenario), function () {
            return patientPromiseGetter().then(function (patient) {
                if (levels[slug] === true) return successChecker(endpoint, patient);
                else if (levels[slug] === false) return failChecker(endpoint, patient);
            });
        });
    };
};
var requiresAuthentication = module.exports.itRequiresAuthentication = function (levels, successChecker, failChecker) {
    return function (endpoint) {
        var gen = genAuthorizationTest(endpoint, levels, successChecker, failChecker);

        describe("testing authorization", function () {
            var patientForMe = function () {
                return auth.createTestUser().then(createMyPatient({}));
            };
            var patientForOther = function () {
                return Q.all([auth.createTestUser(), auth.createTestUser()])
                        .spread(createOtherPatient({}))
                        .then(function (p) {
                            return p;
                        });
            };
            var share = function (access, group) {
                return function (patient) {
                    return Q.nbind(patient.share, patient)(patient.user.email, access, group);
                };
            };
            var setPermission = function (group, access) {
                return function (patient) {
                    // Q.nbind has issues here
                    var deferred = Q.defer();
                    patient.permissions[group] = access;
                    patient.save(function (err) {
                        if (err) return deferred.reject(err);
                        deferred.resolve(patient);
                    });
                    return deferred.promise;
                };
            };

            gen("me", "my patients", patientForMe);
            gen("unassociated", "patients not shared with me", patientForOther);

            var p = function () { return patientForOther().then(share("read", "prime")); };
            gen("explicitRead", "patients explicitly shared read-only with me", p);

            p = function () { return patientForOther().then(share("write", "prime")); };
            gen("explicitWrite", "patients explicitly shared read-write with me", p);

            p = function () {
                return patientForOther().then(setPermission("anyone", "read")).then(share("default", "anyone"));
            };
            gen("anyoneRead", "patients shared as 'anybody' when 'anybody' has read permissions", p);

            p = function () {
                return patientForOther().then(setPermission("anyone", "write")).then(share("default", "anyone"));
            };
            gen("anyoneWrite", "patients shared as 'anybody' when 'anybody' has write permissions", p);

            p = function () {
                return patientForOther().then(setPermission("family", "read")).then(share("default", "family"));
            };
            gen("familyRead", "patients shared as 'family' when 'family' has read permissions", p);

            p = function () {
                return patientForOther().then(setPermission("family", "write")).then(share("default", "family"));
            };
            gen("familyWrite", "patients shared as 'family' when 'family' has write permissions", p);

            p = function () {
                return patientForOther().then(setPermission("prime", "read")).then(share("default", "prime"));
            };
            gen("primeRead", "patients shared as 'prime' when 'prime' has read permissions", p);

            p = function () {
                return patientForOther().then(setPermission("prime", "write")).then(share("default", "prime"));
            };
            gen("primeWrite", "patients shared as 'prime' when 'prime' has write permissions", p);
        });
    };
};
module.exports.itRequiresReadAuthorization = requiresAuthentication({
    unassociated: false,
    me: true,
    explicitRead: true,
    explicitWrite: true,
    anyoneRead: true,
    anyoneWrite: true,
    familyRead: true,
    familyWrite: true,
    primeRead: true,
    primeWrite: true
}, testAuthorizationSuccessful, testAuthorizationFailed);
module.exports.itRequiresWriteAuthorization = requiresAuthentication({
    unassociated: false,
    me: true,
    explicitRead: false,
    explicitWrite: true,
    anyoneRead: false,
    anyoneWrite: true,
    familyRead: false,
    familyWrite: true,
    primeRead: false,
    primeWrite: true
}, testAuthorizationSuccessful, testAuthorizationFailed);
module.exports.itRequiresOnlyMeAuthorization = requiresAuthentication({
    unassociated: false,
    me: true,
    explicitRead: false,
    explicitWrite: false,
    anyoneRead: false,
    anyoneWrite: false,
    familyRead: false,
    familyWrite: false,
    primeRead: false,
    primeWrite: false
}, testAuthorizationSuccessful, testAuthorizationFailed);

// test read authorization for avatar endpoint (don't check success: true in a JSON
// response, but just check HTTP response codes)
var testAuthorizationResponseCodeSuccessful = function (endpoint, patient) {
    // if we should have access check response code was 200
    return expect(endpoint(patient)).to.have.status(200);
};
module.exports.itRequiresNonJsonReadAuthorization = requiresAuthentication({
    unassociated: false,
    me: true,
    explicitRead: true,
    explicitWrite: true,
    anyoneRead: true,
    anyoneWrite: true,
    familyRead: true,
    familyWrite: true,
    primeRead: true,
    primeWrite: true
}, testAuthorizationResponseCodeSuccessful, testAuthorizationFailed);

// test authorization for endpoints that return lists of results: results should
// be returned if authorization was successful, but not otherwise (the generated
// test data has exactly two patients viewable per user)
var testAuthorizationListSuccessful = curry(function (slug, endpoint, patient, medication) {
    return endpoint(patient, medication).then(function (response) {
        // check success: true was in response
        expect(response).to.be.an.api.genericSuccess();

        // there should be the user's default patient as well as the custom generated patient
        expect(response.body[slug].length).to.be.greaterThan(1);
    });
});
var testAuthorizationListFailed = curry(function (slug, endpoint, patient, medication) {
    return endpoint(patient, medication).then(function (response) {
        // check success: true was in response
        expect(response).to.be.an.api.genericSuccess();

        // only the user's default patient should be present
        expect(response.body[slug].length).to.equal(1);
    });
});

// we only consider testcases where the user has access to the patient (otherwise
// a 403 is returned)
module.exports.itRequiresReadListAuthorization = function (slug) {
    return requiresAuthentication({
        unassociated: false,
        me: true,
        explicitRead: true,
        explicitWrite: true,
        anyoneRead: true,
        anyoneWrite: true,
        familyRead: true,
        familyWrite: true,
        primeRead: true,
        primeWrite: true
    }, testAuthorizationListSuccessful(slug), testAuthorizationListFailed(slug));
};

