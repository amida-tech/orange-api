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
var patientSchema = {
    required: ["id", "name", "sex", "birthdate", "avatar", "access", "group", "access_anyone", "access_family",
                "access_prime"],
    properties: {
        id:             { type: "number" },
        name:           { type: "string" },
        sex:            { type: "string" },
        avatar:         { type: "string" },
        access:         { type: "string" },
        group:          { type: ["string", "null"] },
        access_anyone:  { type: "string" },
        access_family:  { type: "string" },
        access_prime:   { type: "string" },
        birthdate:  { type: ["string", "null"] }
    }
};
var avatarSchema = {
    required: ["avatar"],
    properties: {
        avatar:     { type: "string" }
    }
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
/*
var sharePatient = function (user, access, patient) {
    return Q.nbind(patient.share, patient)(user, access);
};
*/

// create a test patient for the current user
var createMyPatient = module.exports.createMyPatient = curry(function (data, user) {
    return fixtures.build("Patient", data).then(function (patientData) {
        return createPatient(patientData, user);
    });
});

/*
// create a test patient for another user and share with the current
var createOtherPatient = module.exports.createOtherPatient = curry(function (data, access, me, other) {
    return createMyPatient(data, other).then(curry(sharePatient)(me)(access)).then(function (patient) {
        // store me in patient
        patient.user = me;
        return patient;
    });
});
*/

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

/*
// setup two test users ('me' + 'other') and patient (with specified data modifications to
// the factory default) for the other user, and share it with the current user with
// the specified access level and then do something to it (e.g., view it)
module.exports.testOtherPatient = function (data, access) {
    return Q.all([auth.createTestUser(), auth.createTestUser()]).spread(createOtherPatient(data, access));
};
*/

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
    return chakram.get("http://localhost:3000/v1/patients/" + patientId, auth.genAuthHeaders(accessToken));
};

// helper methods to check that a resource requires the relevant
// authorization
// endpoint should be a function taking (patient)
var genAuthorizationTest = function (endpoint, levels) {
    // generate testcase names
    var accessName = function (level, scenario) {
        if (level) return "it gives me access to " + scenario;
        else return "it denies me access to " + scenario;
    };

    // generate entire testcase
    return function (slug, scenario, patientPromiseGetter) {
        it(accessName(levels[slug], scenario), function () {
            return patientPromiseGetter().then(function (patient) {
                if (levels[slug]) {
                    // if we should have access check success: true was in response
                    return expect(endpoint(patient)).to.be.an.api.genericSuccess();
                } else {
                    // otherwise check a 403 was returned with the appropriate error slug
                    return expect(endpoint(patient)).to.be.an.api.error(403, "unauthorized");
                }
            });
        });
    };
};
var requiresAuthentication = module.exports.itRequiresAuthentication = function (levels) {
    return function (endpoint) {
        var gen = genAuthorizationTest(endpoint, levels);

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

            var p = function () { return patientForOther().then(share("read", "anyone")); };
            gen("explicitRead", "patients explicitly shared read-only with me", p);

            p = function () { return patientForOther().then(share("write", "anyone")); };
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
});
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
});
