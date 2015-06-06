var mongoose    = require("mongoose"),
    async       = require("async"),
    auth        = require("../common/auth.js"),
    factories   = require("../common/factories.js");

// setup another test user, and patients of every different access level
module.exports.setupTestPatients = function (user, num, context) {
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
                context[key] = function (i) {
                    return function() {
                        return patients[i];
                    };
                };
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
