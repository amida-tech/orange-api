"use strict";

var bcrypt = require("bcrypt"),
    errors = require("../../errors.js").ERRORS;

// password hashing
var SALT_WORK_FACTOR = 10;

// constants for temporarily locking accounts after too many failed auth attempts
// implementation based upon http://blog.mongodb.org/post/34225138670/
// and see that blogpost for documentation
var MAX_LOGIN_ATTEMPTS = 10;
var LOCK_TIME = 60 * 60 * 1000;

module.exports = function (UserSchema) {
    // Hash passwords
    // Based upon http://blog.mongodb.org/post/32866457221
    UserSchema.pre("save", function (next) {
        // Only rehash if password modified
        // Important: not just for efficiency, but otherwise we'd be hashing
        // our hashes
        if (!this.isModified("password")) return next();

        // Generate a salt
        bcrypt.genSalt(SALT_WORK_FACTOR, function (err, salt) {
            if (err) return next(err);

            // Hash the password using our new salt
            bcrypt.hash(this.password, salt, function (err, hash) {
                if (err) return next(err);

                // Override the cleartext password with the hashed one
                this.password = hash;
                next();
            }.bind(this));
        }.bind(this));
    });

    // if account is currently locked
    UserSchema.virtual("isLocked").get(function () {
        // check for a future lockUntil timestamp
        // lockUntil can be 1 (or some low number) if the account should not be locked
        return (typeof this.lockUntil !== "undefined" && this.lockUntil > Date.now());
    });

    // if account has an old, expired lock on it
    UserSchema.virtual("hasOldLock").get(function () {
        return (typeof this.lockUntil !== "undefined" && this.lockUntil <= Date.now());
    });

    // remove any (expired or current) lock
    UserSchema.methods.removeLock = function (callback) {
        // update $unset doesn't seem to be working....
        this.loginAttempts = 0;
        this.lockUntil = undefined;
        this.save(callback);
    };

    // increment # failed login attempts
    UserSchema.methods.incrementLoginAttempts = function (callback) {
        // if we have a previous lock that has expired, remove it and then increment
        if (this.hasOldLock) {
            return this.removeLock(function (err) {
                if (err) return callback(err);
                // this.hasOldLock is false now
                this.incrementLoginAttempts(callback);
            }.bind(this));
        }

        // otherwise increment the lock
        this.loginAttempts++;
        // and lock the account if we've reached max attempts and it's not locked already
        if (this.loginAttempts >= MAX_LOGIN_ATTEMPTS && !this.isLocked) {
            this.lockUntil = Date.now() + LOCK_TIME;
        }
        this.save(callback);
    };

    // Authenticate a specific user from a password
    UserSchema.methods.authenticate = function (candidatePassword, callback) {
        // don't authenticate if account is locked!
        // instead increment login attempts
        if (this.isLocked) {
            return this.incrementLoginAttempts(function (err) {
                if (err) return callback(err);
                return callback(errors.LOGIN_ATTEMPTS_EXCEEDED);
            });
        }

        bcrypt.compare(candidatePassword, this.password, function (err, correctPassword) {
            if (err) return callback(err);
            // if password is correct, remove lock
            if (correctPassword) {
                this.removeLock(function (err) {
                    if (err) return callback(err);
                    // auth successful, so return true!
                    callback(null, true);
                });
            } else {
                // if password is incorrect, increment login attempts
                this.incrementLoginAttempts(function (err) {
                    if (err) return callback(err);
                    return callback(errors.WRONG_PASSWORD);
                });
            }
        }.bind(this));
    };

    // Authenticate an email and password
    UserSchema.statics.authenticate = function (email, password, callback) {
        // require an email address and password
        if (typeof email === "undefined" || email.length <= 0) {
            return callback(errors.EMAIL_REQUIRED);
        }
        if (typeof password === "undefined" || password.length <= 0) {
            return callback(errors.PASSWORD_REQUIRED);
        }

        // find user with corresponding email
        this.findOne({
            email: email
        }, function (err, user) {
            if (err) return callback(err);

            // no user with that email
            if (!user) return callback(errors.USER_NOT_FOUND);

            // try authentication
            user.authenticate(password, function (err) {
                if (err) return callback(err);
                callback(null, user);
            });
        });
    };
};
