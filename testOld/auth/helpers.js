var mongoose = require("mongoose");
var async = require("async");

var factories = require('../factories.js');
var request = require('supertest');
var app = require('../../app.js');

var User = mongoose.model("User");

// make simple user info request to check we're authenticated properly
// takes request containing access token
// first parameter
function checkAuthenticated(res, callback) {
    // gen auth header
    var authHeader = 'Bearer ' + res.body.access_token;
    // check we can get user info with access token
    request(app).get('/v1/user').set('Authorization', authHeader).expect(200, callback);
}

// create and save user we can use to authenticate
function createUser(done) {
    var userData = factories.user(), user;
    // TODO: Work out what's really causing this
    // Occasionally create will return a Connection object rather than a model
    // instance as sUser. Have traced this back as far as model.save in mongoose,
    // but have been unable to pinpoint the source.
    // Not due to write concerns: waiting for journal saves in all mongoose models makes
    // absolutely no difference. Also not due to mongoose-unique-validator as removing
    // that makes no difference.
    // For debugging,
    //      DEBUG=1 mocha --debug-brk test/db_helper.js test/common.js test/users/registration_test.js
    // will setup testing and run a breaking test with mocha attached to a debugger, so
    // you can use node-inspector to debug.
    // For now we explicitly retrieve the user after saving it
    
    // For now we just keep on calling create until we get something back with
    // an email address. Whilst times out after 5 seconds
    async.whilst(
        function () {
            return (typeof user === 'undefined') || (typeof user.email === 'undefined');
        },
        function (callback) {
            userData = factories.user();
            // try and instantiate User model
            mongoose.model("User").create(userData, function (err, sUser) {
                if (err) return callback(err);
                user = sUser;
                callback();
            });
        }, function (err) {
            if (err) return done(err);
            // store raw password in user as password will be hashed,
            // and various other helpful attributes from the factory
            user.rawPassword = userData.rawPassword;
            user.wrongPassword = userData.wrongPassword;
            user.wrongEmail = userData.wrongEmail;
            console.log("returning");
            console.log(user);
            done(null, user);
        }
    );
}

module.exports = {
    checkAuthenticated: checkAuthenticated,
    createUser: createUser
};
