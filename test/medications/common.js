"use strict";

var chakram     = require("chakram"),
    Q           = require("q"),
    curry       = require("curry"),
    auth        = require("../common/auth.js"),
    patients    = require("../patients/common.js"),
    doctors     = require("../doctors/common.js"),
    pharmacies  = require("../pharmacies/common.js"),
    common      = require("../common/chakram.js");
var expect = chakram.expect;

// we validate child schemata, but success shouldn't be present on a doctor
// object here
var doctorSchema = JSON.parse(JSON.stringify(doctors.schema));
doctorSchema.required.splice(doctorSchema.required.indexOf("success"), 1);
delete doctorSchema.properties.success;

// we validate child schemata, but success shouldn't be present on a pharmacy
// object here
var pharmacySchema = JSON.parse(JSON.stringify(pharmacies.schema));
pharmacySchema.required.splice(pharmacySchema.required.indexOf("success"), 1);
delete pharmacySchema.properties.success;

// verify successful responses
/*eslint-disable key-spacing */
var medicationSchema = module.exports.schema = {
    required: ["id", "name", "status", "rx_norm", "ndc", "dose", "route", "form", "rx_number",
                "quantity", "type", "schedule", "fill_date", "number_left", "access_anyone",
                "access_family", "access_prime", "brand", "origin", "import_id", "schedule_summary",
                "notes", "success"],
    properties: {
        success:        { type: "boolean" },
        id:             { type: "number" },
        name:           { type: "string" },
        status:           { type: "string" },
        rx_norm:        { type: "string" },
        ndc:            { type: "string" },
        dose:           {
            type:           ["object", "null"],
            required:       ["quantity", "unit"],
            properties:     {
                quantity:       { type: "number" },
                unit:           { type: "string" }
            }
        },
        route:          { type: "string" },
        form:           { type: "string" },
        rx_number:      { type: "string" },
        fill_date:      { type: ["string", "null"] },
        number_left:    { type: ["number", "null"] },
        quantity:       { type: "number" },
        type:           { type: "string" },
        brand:          { type: "string" },
        origin:         { type: "string" },
        import_id:      { type: ["number", "null"] },
        schedule:       {
            type:           "object",
            required:       ["as_needed", "regularly"],
            properties:     {
                as_needed:  { type: "boolean" },
                regularly:  { type: "boolean" },
                until:      {
                    type:       "object",
                    required:   ["type"],
                    properties: {
                        type:   { type: "string" },
                        stop:   { type: ["number", "string"] }
                    }
                },
                frequency: {
                    type:       "object",
                    required:   ["n", "unit"],
                    properties: {
                        n:          { type: "number" },
                        unit:       { type: "string" },
                        exclude:    {
                            type:       "object",
                            required:   ["exclude", "repeat"],
                            properties: {
                                exclude: {
                                    type:   "array",
                                    items: { type: "number" }
                                },
                                repeat: { type: "number" }
                            }
                        },
                        start:      { type: ["string", "array"] }
                    }
                },
                times: {
                    type:   "array",
                    items:  {
                        type:       "object",
                        required:   ["id", "type"],
                        properties: {
                            id:     { type: "number" },
                            type:   { type: "string" },
                            time:   { type: "string" },
                            event:  { type: "string" },
                            when:   { type: "string" }
                        }
                    }
                },
                take_with_food: { type: ["boolean", "null"] },
                take_with_medications: {
                    type: "array",
                    items: { type: "number" }
                },
                take_without_medications: {
                    type: "array",
                    items: { type: "number" }
                }
            },
            additionalProperties: false
        },
        schedule_summary:   { type: "string" },
        access_anyone:      { type: "string" },
        access_family:      { type: "string" },
        access_prime:       { type: "string" },
        notes:              { type: "string" }
    },
    definitions: {
        doctor: doctorSchema,
        pharmacy: pharmacySchema
    },
    additionalProperties: false
};
/*eslint-enable key-spacing */
var medicationViewSchema = JSON.parse(JSON.stringify(medicationSchema)); // easy deep copy


// viewing a medication in detail should show full doctor and pharmacy details
medicationViewSchema.required.push("doctor");
medicationViewSchema.required.push("pharmacy");
medicationViewSchema.properties.doctor = {
    "$ref": "#/definitions/doctor"
};
medicationViewSchema.properties.pharmacy = {
    "$ref": "#/definitions/pharmacy"
};

// other endpoints should just have  doctor and pharmacy IDs
medicationSchema.required.push("doctor_id");
medicationSchema.required.push("pharmacy_id");
medicationSchema.properties.doctor_id = {
    type: ["number", "null"]
};
medicationSchema.properties.pharmacy_id = {
    type: ["number", "null"]
};

common.addApiChain("medication", {
    "createSuccess": function (respObj) {
        expect(respObj).to.be.an.api.postSuccess;
        expect(respObj).to.have.schema(medicationSchema);
    },
    "viewSuccess": function (respObj) {
        expect(respObj).to.be.an.api.getSuccess;
        expect(respObj).to.have.schema(medicationViewSchema);
    },
    "success": function (respObj) {
        expect(respObj).to.be.an.api.getSuccess;
        expect(respObj).to.have.schema(medicationSchema);
    },
    "listSuccess": function (respObj) {
        expect(respObj).to.be.an.api.genericListSuccess("medications", medicationSchema);
    }
});

// do the same with notification setting responses
/*eslint-disable key-spacing */
var notificationsSchema = {
    required: ["default", "user", "success"],
    properties: {
        success:        { type: "boolean" },
        default:        { type: ["number", "string"] },
        user:           { type: ["number", "string"] }
    },
    additionalProperties: false
};
/*eslint-enable key-spacing */
common.addApiChain("notifications", {
    "success": function (respObj) {
        expect(respObj).to.be.an.api.getSuccess;
        expect(respObj).to.have.schema(notificationsSchema);
    }
});

// generate testcase names
var accessName = function (level, scenario) {
    if (level) return "it gives me access to " + scenario;
    else return "it denies me access to " + scenario;
};

// helper methods for authentication
var testAuthorizationSuccessful = function (endpoint, patient, medication) {
    // if we should have access check success: true was in response
    return expect(endpoint(patient, medication)).to.be.an.api.genericSuccess();
};
var testAuthorizationFailed = function (endpoint, patient, medication) {
    // otherwise check a 403 was returned with the appropriate error slug
    return expect(endpoint(patient, medication)).to.be.an.api.error(403, "unauthorized");
};
// endpoint should be a function taking (patient, medication)
var genAuthorizationTest = function (endpoint, levels, successChecker, failChecker) {
    // generate entire testcase
    return function (slug, scenario, promisesGetter) {
        it(accessName(levels[slug], scenario), function () {
            return Q.spread(promisesGetter(), function (patient, medication) {
                if (levels[slug] === true) return successChecker(endpoint, patient, medication);
                else if (levels[slug] === false) return failChecker(endpoint, patient, medication);
            });
        });
    };
};
// TODO: dry this up with test/patients/common.js
var patientForMe = function () {
    return auth.createTestUser().then(patients.createMyPatient({}));
};
var patientForOther = function () {
    return Q.all([auth.createTestUser(), auth.createTestUser()]).spread(patients.createOtherPatient({}));
};
var share = function (access, group) {
    return function (patient) {
        return Q.nbind(patient.share, patient)(patient.user.email, access, group);
    };
};
var setPermission = function (group, access) {
    return function (resource) {
        // Q.nbind has issues here
        var deferred = Q.defer();
        resource.permissions[group] = access;
        resource.save(function (err) {
            if (err) return deferred.reject(err);
            deferred.resolve(resource);
        });
        return deferred.promise;
    };
};
var createMed = function (data) {
    if (typeof data !== "object" || data === null) data = {};

    return function (patient) {
        return Q.nbind(patient.createMedication, patient)({
            name: "testmed",
            schedule: {
                as_needed: (data.as_needed === true),
                regularly: true,
                until: { type: "forever" },
                frequency: { n: 1, unit: "day" },
                times: [{ type: "exact", time: "09:00" }],
                take_with_food: null,
                take_with_medications: [],
                take_without_medications: []
            },
            creator: data.creator
        });
    };
};
// must save patient after modifiying medication
var save = function (patientPromise) {
    return function (medication) {
        return patientPromise.then(function (patient) {
            // save patient
            // Q.nbind has issues here
            var deferred = Q.defer();
            patient.markModified("medications");
            patient.save(function (err) {
                if (err) return deferred.reject(err);
                deferred.resolve(patient);
            });
            return deferred.promise;
        }).then(function () {
            // return medication
            return medication;
        });
    };
};
var me = function () {
    var p = patientForMe();
    var m = p.then(createMed());
    return [p, m];
};

var unassociated = function () {
    var p = patientForOther();
    var m = p.then(createMed()).then(save(p));
    return [p, m];
};

var owner = function () {
    var p = patientForOther().then(share("write", "anyone"));
    var m = p.then(function (patient) {
        return createMed({
            creator: patient.user.email
        })(patient);
    }).then(setPermission("anyone", "none")).then(save(p));
    return [p, m];
};

var none = function () {
    var p = patientForOther().then(share("write", "anyone"));
    var m = p.then(createMed()).then(setPermission("anyone", "none")).then(save(p));
    return [p, m];
};

var read = function () {
    var p = patientForOther().then(share("write", "anyone"));
    var m = p.then(createMed()).then(setPermission("anyone", "read")).then(save(p));
    return [p, m];
};

var write = function () {
    var p = patientForOther().then(share("write", "anyone"));
    var m = p.then(createMed()).then(setPermission("anyone", "write")).then(save(p));
    return [p, m];
};

var defFamilyAsNeeded = function () {
    var p = patientForOther().then(setPermission("family", "write")).then(share("default", "family"));
    var m = p.then(createMed({
        as_needed: true
    })).then(setPermission("family", "default")).then(save(p));
    return [p, m];
};

var defFamily = function () {
    var p = patientForOther().then(setPermission("family", "read")).then(share("default", "family"));
    var m = p.then(createMed()).then(setPermission("family", "default")).then(save(p));
    return [p, m];
};

var defAnyone = function () {
    var p = patientForOther().then(setPermission("anyone", "read")).then(share("default", "anyone"));
    var m = p.then(createMed()).then(setPermission("anyone", "default")).then(save(p));
    return [p, m];
};

var defPrimeWrite = function () {
    var p = patientForOther().then(setPermission("prime", "write")).then(share("default", "prime"));
    var m = p.then(createMed()).then(setPermission("prime", "default")).then(save(p));
    return [p, m];
};

var defPrimeRead = function () {
    var p = patientForOther().then(setPermission("prime", "read")).then(share("default", "prime"));
    var m = p.then(createMed()).then(setPermission("prime", "default")).then(save(p));
    return [p, m];
};

var requiresAuthentication = module.exports.itRequiresAuthentication = function (levels, successChecker, failChecker) {
    return function (endpoint) {
        var gen = genAuthorizationTest(endpoint, levels, successChecker, failChecker);

        describe("testing authorization", function () {
            // write
            gen("me", "my patients", me);
            // none
            gen("unassociated", "patients not shared with me", unassociated);
            // write
            gen("owner", "medications with 'none' but me as set the owner", owner);

            // none
            gen("none", "medications with 'none'", none);
            // read
            gen("read", "medications with 'read'", read);
            // write
            gen("write", "medications with 'write'", write);

            // write
            gen("defFamilyAsNeeded", "as-needed medications with 'default' when the share is under 'family'",
                    defFamilyAsNeeded);
            // read
            gen("defFamily", "non-as-needed medications with 'default' when the share is under 'family'", defFamily);

            // read
            gen("defAnyone", "medications with 'default' when the share is under 'anyone'", defAnyone);

            // write
            gen("defPrimeWrite", "medications with 'default' when the 'prime' patient has 'write' permissions",
                    defPrimeWrite);
            // read
            gen("defPrimeRead", "medications with 'default' when the 'prime' patient has 'read' permissions",
                    defPrimeRead);
        });
    };
};
module.exports.itRequiresReadAuthorization = requiresAuthentication({
    me: true,
    unassociated: false,
    owner: true,
    none: false,
    read: true,
    write: true,
    defFamilyAsNeeded: true,
    defFamily: true,
    defAnyone: true,
    defPrimeWrite: true,
    defPrimeRead: true
}, testAuthorizationSuccessful, testAuthorizationFailed);
module.exports.itRequiresWriteAuthorization = requiresAuthentication({
    me: true,
    unassociated: false,
    owner: true,
    none: false,
    read: false,
    write: true,
    defFamilyAsNeeded: true,
    defFamily: false,
    defAnyone: false,
    defPrimeWrite: true,
    defPrimeRead: false
}, testAuthorizationSuccessful, testAuthorizationFailed);

// test authorization for endpoints that return lists of results: results should
// be returned if authorization was successful, but not otherwise (this assumes that
// endpoint either filters by medication ID, or that the generated test data only has
// one medication viewable per user: both are true)
var testAuthorizationListSuccessful = curry(function (slug, endpoint, patient, medication) {
    return endpoint(patient, medication).then(function (response) {
        // check success: true was in response
        expect(response).to.be.an.api.genericSuccess();

        // there should be one response key that's not success, this will contain
        // a list of all the data (e.g., "medications")
        expect(response.body[slug].length).to.be.greaterThan(0);
    });
});
var testAuthorizationListFailed = curry(function (slug, endpoint, patient, medication) {
    return endpoint(patient, medication).then(function (response) {
        // check success: true was in response
        expect(response).to.be.an.api.genericSuccess();

        // there should be one response key that's not success, this will contain
        // a list of all the data (e.g., "medications"). we should have no
        // data here.
        expect(response.body[slug].length).to.equal(0);
    });
});

// we only consider testcases where the user has access to the patient (otherwise
// a 403 is returned)
module.exports.itRequiresReadListAuthorization = function (slug) {
    return requiresAuthentication({
        me: true,
        defWrite: true,
        defRead: true,
        defDefRead: true,
        defDefWrite: true,
        none: false,
        read: true,
        write: true
    }, testAuthorizationListSuccessful(slug), testAuthorizationListFailed(slug));
};

// test authorization for endpoints that take multiple medication IDs and require
// successful authorization for _all_ of them
var reqAllAuth = module.exports.itRequiresAuthentication = function (levels, successChecker, failChecker) {
    return function (endpoint) {
        var gen = genAuthorizationTest(endpoint, levels, successChecker, failChecker);

        describe("testing authorization", function () {
            gen("empty", "no medications", function () {
                var p = patientForMe();
                return [p, []];
            });

            gen("readable", "medications we have read access to", function () {
                var p = patientForOther().then(share("write", "anyone"));

                var meds = p.then(function (patient) {
                    // med we have med-level read access to
                    var readMed = createMed()(patient).then(setPermission("anyone", "read"));
                    // med we have med-level write access to
                    var writeMed = function () {
                        return createMed()(patient).then(setPermission("anyone", "write"));
                    };

                    return readMed.then(function (mRead) {
                        return writeMed().then(save(p)).then(function (mWrite) {
                            return [mRead, mWrite];
                        });
                    });
                });

                return [p, meds];
            });

            gen("writable", "medications we have writable access to", function () {
                var p = patientForOther().then(share("write", "anyone"));
                var m = p.then(createMed()).then(setPermission("anyone", "write")).then(save(p));

                return [p, m.then(function (med) { return [med]; })];
            });

            gen("none", "medications we have no access to", function () {
                var p = patientForOther().then(share("write", "anyone"));

                var meds = p.then(function (patient) {
                    // med we have med-level write access to
                    var writeMed = createMed()(patient).then(setPermission("anyone", "write"));
                    // med we have no med-level access to
                    var noMed = function () {
                        return createMed()(patient).then(setPermission("anyone", "none"));
                    };

                    return writeMed.then(function (mWrite) {
                        return noMed().then(save(p)).then(function (mNone) {
                            return [mWrite, mNone];
                        });
                    });
                });

                return [p, meds];
            });
        });
    };
};

module.exports.itRequiresReadAllAuthorization = reqAllAuth({
    empty: true,
    readable: true,
    writable: true,
    none: false
}, testAuthorizationSuccessful, testAuthorizationFailed);
module.exports.itRequiresWriteAllAuthorization = reqAllAuth({
    empty: true,
    readable: false,
    writable: true,
    none: false
}, testAuthorizationSuccessful, testAuthorizationFailed);
