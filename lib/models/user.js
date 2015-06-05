"use strict";
var mongoose = require('mongoose');
var uniqueValidator = require('mongoose-unique-validator');

var errors = require('../errors.js').ERRORS;

// password hashing
var bcrypt = require('bcrypt');
var SALT_WORK_FACTOR = 10;

// constants for temporarily locking accounts after too many failed auth attempts
// implementation based upon http://blog.mongodb.org/post/34225138670/
// and see that blogpost for documentation
var MAX_LOGIN_ATTEMPTS = 10;
var LOCK_TIME = 60 * 60 * 1000;

// As per README matches the HH:MM format specified in ISO 8601
var TIME_REGEXP = /^(0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$/;

var UserSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        index: { unique: true },
        // basic loose regexp for email address matching
        match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Invalid email address']
    },
    password:       { type: String, required: true}, // hashed
    name:           { type: String },
    loginAttempts:  { type: Number, required: true, default: 0 },
    lockUntil:      { type: Number }, // unix time, set to 1 when not locked
    wake:           { type: String, match: [TIME_REGEXP, 'Invalid wake time'] },
    sleep:          { type: String, match: [TIME_REGEXP, 'Invalid sleep time'] },
    breakfast:      { type: String, match: [TIME_REGEXP, 'Invalid breakfast time'] },
    lunch:          { type: String, match: [TIME_REGEXP, 'Invalid lunch time'] },
    dinner:         { type: String, match: [TIME_REGEXP, 'Invalid dinner time'] }
});
UserSchema.plugin(uniqueValidator, {message: "USER_ALREADY_EXISTS"}); // Give errors when email uniqueness broken

// store empty names rather than undefined ones
UserSchema.pre('save', function (next) {
    if (typeof this.name === 'undefined') this.name = '';
    next();
});

// Hash passwords
// Based upon http://blog.mongodb.org/post/32866457221
UserSchema.pre('save', function (next) {
    // Only rehash if password modified
    // Important: not just for efficiency, but otherwise we'd be hashing
    // our hashes
    if (!this.isModified('password')) return next();

    // Generate a salt
    bcrypt.genSalt(SALT_WORK_FACTOR, function(err, salt) {
        if (err) return next(err);

        // Hash the password using our new salt
        bcrypt.hash(this.password, salt, function(err, hash) {
            if (err) return next(err);

            // Override the cleartext password with the hashed one
            this.password = hash;
            next();
        }.bind(this));
    }.bind(this));
});

UserSchema.pre('save', function (next, done) {
    // if we're changing the password, we need to remove all old authorisation
    // tokens
    if (this.isModified('password')) this.expireAuthTokens(done);
    next();
});

// if account is currently locked
UserSchema.virtual('isLocked').get(function() {
    // check for a future lockUntil timestamp
    // lockUntil can be 1 (or some low number) if the account should not be locked
    return (typeof this.lockUntil !== 'undefined' && this.lockUntil > Date.now());
});

// if account has an old, expired lock on it
UserSchema.virtual('hasOldLock').get(function() {
    return (typeof this.lockUntil !== 'undefined' && this.lockUntil <= Date.now());
});

// remove any (expired or current) lock
UserSchema.methods.removeLock = function (callback) {
    return this.update({
        $set: { loginAttempts: 0 }, // reset loginAttempts
        $unset: { lockUntil: 1 } // remove the lock
    }, callback);
}

// increment # failed login attempts
UserSchema.methods.incrementLoginAttempts = function(callback) {
    // if we have a previous lock that has expired, remove it and then increment
    if (this.hasOldLock)  {
        return this.removeLock(function (err) {
            if (err) return callback(err);
            // this.hasOldLock is false now
            this.incrementLoginAttempts(callback);
        });
    }

    // otherwise increment the lock
    this.loginAttempts++;
    // and lock the account if we've reached max attempts and it's not locked already
    if (this.loginAttempts >= MAX_LOGIN_ATTEMPTS && !this.isLocked) {
        this.lockUntil = Date.now() + LOCK_TIME;
    }
    this.save(callback);
};

// Authenticate a specific user
UserSchema.methods.authenticate = function (candidatePassword, callback) {
    // don't authenticate if account is locked!
    // instead increment login attempts
    if (this.isLocked) {
        return this.incrementLoginAttempts(function(err) {
            if (err) return callback(err);
            return callback(errors.LOGIN_ATTEMPTS_EXCEEDED);
        });
    }

    bcrypt.compare(candidatePassword, this.password, function (err, correctPassword) {
        // if password is correct, remove lock
        if (correctPassword) {
            this.removeLock(function (err) {
                if (err) return callback(err);
                // auth successful, so return true!
                callback(null, true);
            });
        } else {
            // if password is incorrect, increment login attempts
            this.incrementLoginAttempts(function(err) {
                if (err) return callback(err);
                return callback(errors.WRONG_PASSWORD);
            });
        }
    }.bind(this));
};

// Authenticate an email and password
UserSchema.statics.authenticate = function (email, password, callback) {
    // require an email address and password
    if (typeof email === 'undefined' || email.length <= 0) {
        return callback(errors.EMAIL_REQUIRED);
    }
    if (typeof password === 'undefined' || password.length <= 0) {
        return callback(errors.PASSWORD_REQUIRED);
    }

    // find user with corresponding email
    this.findOne({ email: email }, function (err, user) {
        if (err) return callback(err);

        // no user with that email
        if (!user) return callback(errors.USER_NOT_FOUND);

        // try authentication
        user.authenticate(password, function (err, correctPassword) {
            if (err) return callback(err);
            callback(null, user);
        });
    });
}

// Delete all authentication tokens belonging to a specific user
UserSchema.methods.expireAuthTokens = function (callback) {
    // don't just require('AccessToken') as this creates a recursive require
    // loop and node gives some weird TypeErrors as a result
    mongoose.model('AccessToken').remove({ email: this.email }, callback);
}

UserSchema.virtual('habits').get(function() {
    return { wake: this.wake, sleep: this.sleep, breakfast: this.breakfast, lunch: this.lunch, dinner: this.dinner }
}).set(function (habits) {
    // Upate the habits of a user from an object containing them, ignoring any undefined
    // values but storing any blank values
    if (typeof habits.wake !== 'undefined') this.wake = habits.wake;
    if (typeof habits.sleep !== 'undefined') this.sleep = habits.sleep;
    if (typeof habits.breakfast !== 'undefined') this.breakfast = habits.breakfast;
    if (typeof habits.lunch !== 'undefined') this.lunch = habits.lunch;
    if (typeof habits.dinner !== 'undefined') this.dinner = habits.dinner;
});

var User = module.exports = mongoose.model('User', UserSchema);
