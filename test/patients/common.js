var mongoose    = require("mongoose"),
    async       = require("async"),
    auth        = require("../common/auth.js"),
    factories   = require("../common/factories.js");

var common = module.exports = {};

// setup another test user, and patients of every different access level
common.setupTestPatients = function (user, num, context) {
    var Patient = mongoose.model("Patient");

    // setup another test user (otherUser)
    context.otherUser = auth.newUser();
    before(function (done) {
        context.otherUser.save(done);
    });

    // helper wrapper to setup patients
    function generatePatients(creator, key, sharee, access) {
        before(function (done) {
            async.times(num, function (n, next) {
                Patient.createForUser(new Patient(factories.patient()), creator, function (err, patient) {
                    if (err) return next(err);
                    if (typeof sharee === 'undefined') return next(null, patient);
                    patient.share(sharee, access, next);
                });
            }, function (err, patients) {
                if (err) return done(err);
                context[key] = patients;
                done();
            });
        });
    }

    // setup num patients of mine shared with write access to otherUser
    generatePatients(context.user, 'myPatientsWrite', context.otherUser, 'write');
    // setup num patients of mine shared with read access to otherUser
    generatePatients(context.user, 'myPatientsRead', context.otherUser, 'read');
    // setup num patients of mine not shared with otherUser
    generatePatients(context.user, 'myPatientsNone');
    // setup num patients of otherUser shared with write access to me
    generatePatients(context.otherUser, 'otherPatientsWrite', context.user, 'write');
    // setup num patients of otherUser shared with read access to me
    generatePatients(context.otherUser, 'otherPatientsRead', context.user, 'read');
    // setup num patients of otherUser not shared with me
    generatePatients(context.otherUser, 'otherPatientsNone');
};

// given a key for a list of patients in the context, returns a getter function to return the ID
// of a patient (different each time)
// so we can use crud/requests/etc here, but generate patients and hence URLs dynamically at runtimes
common.oneOf = function (context, key) {
    var counter = 0;
    return function () {
        counter = (counter + 1) % context[key].length;
        return context[key][counter]._id;
    };
};

common.endpoint = function (patientId) {
    // patient ID may be a getter function
    // we wrap it here into a getter function
    if (!!(patientId && patientId.constructor && patientId.call && patientId.apply)) {
        // getter function
        return function () {
            return "/patients/" + patientId();
        };
    } else {
        // string/something hopefully responding to toString
        return "/patients/" + patientId;
    }
};


common.requiresPatientAuthorization = function (access, methodFails, successFunction, context) {
    auth.requiresAuthentication(async.apply(methodFails, common.oneOf(context, "myPatientsNone")));

    if (access !== 'read') {
        describe("with patients shared read-only with me", function () {
            methodFails(common.oneOf(context, "otherPatientsRead"), 403, "unauthorized", context.accessTokenGetter);
        });
    } else {
        describe("with patients shared read-only with me", function () {
            successFunction.bind(context)(common.oneOf(context, "otherPatientsRead"));
        });
    }

    describe("with patients not shared with me", function () {
        methodFails(common.oneOf(context, "otherPatientsNone"), 403, "unauthorized", context.accessTokenGetter);
    });
    describe("with invalid patient ID", function () {
        methodFails("notanid", 404, "invalid_patient_id", context.accessTokenGetter);
        methodFails(99999, 404, "invalid_patient_id", context.accessTokenGetter);
    });

    describe("with my patients", function () {
        successFunction.bind(context)(common.oneOf(context, "myPatientsNone"));
    }.bind(this));
    describe("with patients shared read-write with me", function () {
        successFunction.bind(context)(common.oneOf(context, "otherPatientsWrite"));
    }.bind(this));
};
