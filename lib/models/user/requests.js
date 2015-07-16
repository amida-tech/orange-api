"use strict";
var async       = require("async"),
    mongoose    = require("mongoose"),
    errors      = require("../../errors.js").ERRORS;

module.exports = function (UserSchema) {
    // request access to the data of another user
    UserSchema.methods.makeRequest = function (email, callback) {
        // check an email address has been specified
        if (typeof email === "undefined" || email === null || email.length === 0)
            return callback(errors.EMAIL_REQUIRED);

        // check we haven't already requested access from that user
        var existing = this.requested.filter(function (request) {
            return request.email === email;
        });
        if (existing.length > 0) return callback(errors.ALREADY_REQUESTED);

        // find the user the request is being made to
        this.constructor.findOne({ email: email }, function (err, user) {
            if (err) return callback(err);
            if (!user) return callback(errors.INVALID_EMAIL); // no user found for that email

            // store request in that user (in _requests_ array)
            user.requests.push({
                email: this.email
            });
            // and in this user (in _requested_ array)
            // create Request instance before pushing so we can return request
            // with its id
            var Request = mongoose.model("Request");
            var request = new Request({
                email: user.email
            });
            request.getId(function (err) { // add numeric ID to request
                if (err) return callback(err);
                this.requested.push(request);

                // save both users
                user.markModified("requests");
                this.markModified("requested");
                async.parallel({
                    me: function (cb) {
                        this.save(cb);
                    }.bind(this),
                    other: function (cb) {
                        user.save(cb);
                    }
                }, function (err, data) {
                    if (err) return callback(err);
                    callback(null, request);
                });
            }.bind(this));
        }.bind(this));
    };

    // cancel a pending request made by this user
    UserSchema.methods.cancelRequest = function (requestId, callback) {
        // try and find request in this user
        var requested = this.requested.id(requestId);
        if (!requested) return callback(errors.INVALID_REQUEST_ID);

        // find request in the other user
        var user = this.constructor.findOne({ email: requested.email }, function (err, user) {
            if (err) return callback(err);
            if (!user) return callback(errors.INVALID_REQUEST_ID); // should never occur

            var request = user.requests.filter(function (req) {
                return req.email === this.email;
            }.bind(this))[0];
            if (typeof request === "undefined" || request === null)
                return callback(errors.INVALID_REQUEST_ID); // should never occur

            // remove both requests
            request.remove();
            requested.remove();

            // save both users
            user.markModified("requests");
            this.markModified("requested");
            async.parallel({
                me: function (cb) {
                    this.save(cb);
                }.bind(this),
                other: function (cb) {
                    user.save(cb);
                }
            }, function (err, data) {
                if (err) return callback(err);
                callback(null, requested);
            });

        }.bind(this));
    };

    // close (either accepted or rejected) a pending request made *to* this user
    UserSchema.methods.closeRequest = function (requestId, callback) {
        // try and find request in this user
        var request = this.requests.id(requestId);
        if (!request) return callback(errors.INVALID_REQUEST_ID);

        // find request in the other user
        var user = this.constructor.findOne({ email: request.email }, function (err, user) {
            if (err) return callback(err);
            if (!user) return callback(errors.INVALID_REQUEST_ID); // should never occur

            var requested = user.requested.filter(function (req) {
                return req.email === this.email;
            }.bind(this))[0];
            if (typeof requested === "undefined" || requested === null)
                return callback(errors.INVALID_REQUEST_ID); // should never occur

            // remove both requests
            request.remove();
            requested.remove();

            // save both users
            user.markModified("requests");
            this.markModified("requested");
            async.parallel({
                me: function (cb) {
                    this.save(cb);
                }.bind(this),
                other: function (cb) {
                    user.save(cb);
                }
            }, function (err, data) {
                if (err) return callback(err);
                callback(null, request);
            });

        }.bind(this));
    };
};
