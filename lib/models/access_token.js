"use strict";
var mongoose = require('mongoose');
var uniqueValidator = require('mongoose-unique-validator');
var crypto = require('crypto');
var errors = require('../errors.js').ERRORS;

// models required this way to 100% avoid circular dependencies
var User = mongoose.model("User");

// access tokens used for auth in API
var AccessTokenSchema = new mongoose.Schema({
    token: { type: String, required: true, index: { unique: true } },
    email: { type: String, required: true }
});
AccessTokenSchema.plugin(uniqueValidator); // Give errors when token uniqueness broken

// generate random access token
AccessTokenSchema.statics.generateAccessToken = function(callback) {
    // copied from thomseddon/node-oauth2-server
    crypto.randomBytes(256, function (err, buffer) {
        if (err) return callback(err);

        // gen token
        var token = crypto.createHash('sha1').update(buffer).digest('hex'); 
        callback(null, token);
    });
}

// generate and save access token for a specific email
AccessTokenSchema.statics.generateSaveAccessToken = function(email, callback) {
    this.generateAccessToken(function(err, token) {
        if (err) return callback(err);

        // save generated token
        this.create({ token: token, email: email }, callback);
    }.bind(this));
}

// find user from access token
AccessTokenSchema.statics.authenticate = function(accessToken, callback) {
    this.findOne({ token: accessToken }, function (err, token) {
        if (err) return callback(err);

        // no access token found
        if (!token) return callback(errors.INVALID_ACCESS_TOKEN);

        // find associated user
        User.findOne({ email: token.email }, function (err, user) {
            if (err) return callback(err);

            // no user found from the access token
            if (!user) return callback(errors.INVALID_ACCESS_TOKEN);

            // user found and authenticatd!
            callback(null, user);
        });
    });
}

var AccessToken = module.exports = mongoose.model('AccessToken', AccessTokenSchema);
