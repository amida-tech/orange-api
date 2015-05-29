"use strict";
var mongoose = require('mongoose');
var uniqueValidator = require('mongoose-unique-validator');

var bcrypt = require('bcrypt');
var SALT_WORK_FACTOR = 10;

// login locking
// implementation based upon http://blog.mongodb.org/post/34225138670/
var MAX_LOGIN_ATTEMPTS = 10;
var LOCK_TIME = 60 * 60 * 1000;


var UserSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        index: { unique: true },
        match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Invalid email address']
    },
    password:       { type: String, required: true}, // hashed
    name:           { type: String },
    loginAttempts:  { type: Number, required: true, default: 0 },
    lockUntil:      { type: Number } // unix time
});
UserSchema.plugin(uniqueValidator); // Give errors when email uniqueness broken

// Hash passwords
// Based upon http://blog.mongodb.org/post/32866457221
UserSchema.pre('save', function (next) {
    var user = this;

    // Only rehash if password modified
    // Important: not just for efficiency, but otherwise we'd be hashing
    // our hashes
    if (!user.isModified('password')) return next();

    // Generate a salt
    bcrypt.genSalt(SALT_WORK_FACTOR, function(err, salt) {
        if (err) return next(err);

        // Hash the password using our new salt
        bcrypt.hash(user.password, salt, function(err, hash) {
            if (err) return next(err);

            // Override the cleartext password with the hashed one
            user.password = hash;
            next();
        });
    });
});

// locking
// this and incLoginAttempts copied from http://blog.mongodb.org/post/34225138670
UserSchema.virtual('isLocked').get(function() {
    // check for a future lockUntil timestamp
    return !!(this.lockUntil && this.lockUntil > Date.now());
});

// increment # failed login attempts
UserSchema.methods.incLoginAttempts = function(callback) {
    // if we have a previous lock that has expired, restart at 1
    if (this.lockUntil && this.lockUntil < Date.now()) {
        return this.update({
            $set: { loginAttempts: 1 },
            $unset: { lockUntil: 1 }
        }, callback);
    }
    // otherwise we're incrementing
    var updates = { $inc: { loginAttempts: 1 } };
    // lock the account if we've reached max attempts and it's not locked already
    if (this.loginAttempts + 1 >= MAX_LOGIN_ATTEMPTS && !this.isLocked) {
        updates.$set = { lockUntil: Date.now() + LOCK_TIME };
    }
    return this.update(updates, callback);
};

// Authenticate a specific user
UserSchema.methods.authenticate = function (candidatePassword, callback) {
    bcrypt.compare(candidatePassword, this.password, function (err, isMatch) {
        callback(null, isMatch);
    });
};

// Authenticate an email and password
UserSchema.statics.authenticate = function (email, password, callback) {
    if (typeof email === 'undefined' || email.length <= 0) {
        return callback(new Error('email_required'));
    }

    this.findOne({ email: email }, function (err, user) {
        if (err) { return callback(err); }
        if (!user) {
            return callback(new Error('user_not_found'));
        }
        if (user.isLocked) {
            // just increment login attempts if account is already locked
            return user.incLoginAttempts(function(err) {
                if (err) { return callback(err); }
                return callback(new Error('login_attempts_exceeded'));
            });
        }
        user.authenticate(password, function (err, isMatch) {
            if (isMatch) {
                // if there's no lock or failed attempts, just return the user
                if (!user.loginAttempts && !user.lockUntil) {
                    return callback(null, user);
                }
                // reset attempts and lock info
                var updates = {
                    $set: { loginAttempts: 0 },
                    $unset: { lockUntil: 1 } // 1 < Date.now()
                };
                return user.update(updates, function(err) {
                    if (err) { return callback(err); }
                    return callback(null, user);
                });
            } else {
                // password incorrect so increment login attempts
                user.incLoginAttempts(function (err) {
                    if (err) { return callback(err); }
                    return callback(new Error('invalid_password'));
                });
            }
        });
    });
}

// Delete all authentication tokens belonging to a specific user
UserSchema.methods.expireAuthTokens = function (callback) {
    // don't just require('AccessToken') as this creates a recursive require
    // loop and node gives some weird TypeErrors as a result
    mongoose.model('AccessToken').remove({ email: this.email }, callback);
}

var User = module.exports = mongoose.model('User', UserSchema);
