var mongoose = require('mongoose');
var uniqueValidator = require('mongoose-unique-validator');
var crypto = require('crypto');

var AccessTokenSchema = new mongoose.Schema({
    token: { type: String, required: true, index: { unique: true } },
    email: { type: String, required: true }
});
AccessTokenSchema.plugin(uniqueValidator); // Give errors when token uniqueness broken

// generate random access token
AccessTokenSchema.statics.generateAccessToken = function(callback) {
    // copied from thomseddon/node-oauth2-server
    crypto.randomBytes(256, function (err, buffer) {
        if (err) {
            return callback(err);
        }

        var token = crypto
            .createHash('sha1')
            .update(buffer)
            .digest('hex');

        callback(false, token);
    });
}

// generate and save access token for a specific email
AccessTokenSchema.statics.generateSaveAccessToken = function(email, callback) {
    this.generateAccessToken(function(err, token) {
        if (err) {
            return callback(err);
        }

        var accessToken = new this({
            token: token,
            email: email
        });
        accessToken.save(callback);
    }.bind(this));
}

var AccessToken = module.exports = mongoose.model('AccessToken', AccessTokenSchema);
