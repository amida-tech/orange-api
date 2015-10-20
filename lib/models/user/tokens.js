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
    // tokens are stored in an array with the oldest at the head and the newest
    // at the tail
    UserSchema.methods.generateSaveAccessToken = function (callback) {
        // 32 random bytes ==> as many (and as random) possibilities as SHA256 but faster
        var token = crypto.randomBytes(32).toString("hex");

        this.tokens.push(token);
        // if we have 5 or greater tokens currently, replace the oldest token
        // (replace the oldest token rather than only keeping the 5 newest tokens,
        // because this way we grandfather in old data by keeping
        // all tokens for existing users with >5 access tokens)
        if (this.tokens.length > 5) this.tokens = this.tokens.splice(this.tokens.length - 5);

        this.markModified("tokens");
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
