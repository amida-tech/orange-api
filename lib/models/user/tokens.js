"use strict";
var crypto = require("crypto"),
    errors = require("../../errors.js").ERRORS;

module.exports = function (UserSchema) {
    UserSchema.pre("save", function (next) {
        // if we're changing the password, we need to remove all old authorisation
        // tokens
        if (this.isModified("password")) this.tokens = [];
        next();
    });

    // Generate and save an access token for a user
    UserSchema.methods.generateSaveAccessToken = function (callback) {
        // 32 random bytes ==> as many (and as random) possibilities as SHA256 but faster
        var token = crypto.randomBytes(32).toString("hex");
        this.tokens.push(token);
        this.save(function (err) {
            if (err) return callback(err);
            // return token not user
            callback(null, token);
        });
    };

    // Authenticate from an access token
    UserSchema.statics.authenticateFromAccessToken = function (accessToken, callback) {
        this.findOne({
            "tokens": accessToken
        }, function (err, user) {
            if (err) return callback(err);
            // no user with that token
            if (!user) return callback(errors.INVALID_ACCESS_TOKEN);
            callback(null, user);
        });
    };
};
