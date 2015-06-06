"use strict";
var mongoose    = require("mongoose"),
    async       = require("async"),
    factories   = require("../common/factories.js");

// don't save
module.exports.newUser = function () {
    // mongoose setup on before hook, so find models inside
    // functions
    var User = mongoose.model("User");
    return new User(factories.user());
};

// save user and generate access token
module.exports.saveUser = function (user, callback) {
    async.series({user: user.save, token: user.generateSaveAccessToken.bind(user)}, function (err, data) {
        if (err) return callback(err);
        callback(null, user, data.token);
    });
};

// save user into context, generate access token, and create getter function
// context should probably be a describe-level this
module.exports.setupTestUser = function (context) {
    context.user = module.exports.newUser();
    before(function (done) {
        // generates access token as well
        module.exports.saveUser(context.user, function (err, u, token) {
            if (err) return done(err);
            // store user and access token
            context.user = u;
            context.accessToken = token;
            done();
        });
    });

    // we usually need to pass a getter function into e.g., our crud helper methods
    // because we're calling those at require-time, whereas the access token hasn't been
    // generated until load time
    context.accessTokenGetter = function() {
        return context.accessToken;
    }.bind(context);
}


// check authentication is required for a given method
// failMethod = helper method like changeFails from put_user_info.js
// taking data, access token, response code and error
module.exports.requiresAuthentication = function (failMethod) {
    describe("with no access token", function () {
        failMethod(401, "access_token_required", null);
    });
    describe("with invalid access token", function () {
        failMethod(401, "invalid_access_token", factories.invalidAccessToken());
    });
}
