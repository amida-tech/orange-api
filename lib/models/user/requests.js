"use strict";
var async = require("async"),
    mongoose = require("mongoose"),
    errors = require("../../errors.js").ERRORS;

module.exports = function(UserSchema) {
    // request access to the data of another user
    UserSchema.methods.makeRequest = function(email, callback) {
        // check an email address has been specified
        if (typeof email === "undefined" || email === null || email.length === 0)
            return callback(errors.EMAIL_REQUIRED);

        // check we haven't already requested access from that user
        var existing = this.requested.filter(function(request) {
            return request.email === email;
        });
        if (existing.length > 0) return callback(errors.ALREADY_REQUESTED);

        // check we not requesting share with yourself
        if (email === this.email) return callback(errors.CANT_REQUEST_YOURSELF);

        // find the user the request is being made to
        this.constructor.findOne({
            email: email
        }, function(err, user) {
            if (err) return callback(err);
            if (!user) return callback(errors.INVALID_EMAIL); // no user found for that email

            // store request in that user (in _requests_ array)
            user.requests.push({
                email: this.email,
                status: "pending"
            });
            // and in this user (in _requested_ array)
            // create Request instance before pushing so we can return request
            // with its id
            var Request = mongoose.model("Request");
            var request = new Request({
                email: user.email,
                status: "pending"
            });
            request.getId(function(err) { // add numeric ID to request
                if (err) return callback(err);
                this.requested.push(request);

                // save both users
                user.markModified("requests");
                this.markModified("requested");
                async.parallel({
                    me: function(cb) {
                        this.save(cb);
                    }.bind(this),
                    other: function(cb) {
                        user.save(cb);
                    }
                }, function(err) {
                    if (err) return callback(err);

                    // if everything went successfully, send the user to whom the request
                    // was made a notification
                    // notify is asynchronous but we don't care about waiting for the result
                    user.notify({
                        template: "request_opened",
                        data: {
                            requestor: this,
                            requestee: user
                        }
                    });

                    callback(null, request);
                }.bind(this));
            }.bind(this));
        }.bind(this));
    };

    // cancel a pending request made by this user
    UserSchema.methods.cancelRequest = function(requestId, callback) {
        // try and find request in this user
        var requested = this.requested.id(requestId);
        if (!requested) return callback(errors.INVALID_REQUEST_ID);

        // find request in the other user
        this.constructor.findOne({
            email: requested.email
        }, function(err, user) {
            if (err) return callback(err);
            if (!user) return callback(errors.INVALID_REQUEST_ID); // should never occur

            var request = user.requests.filter(function(req) {
                return req.email === this.email;
            }.bind(this))[0];
            if (typeof request === "undefined" || request === null || requested.status !== "pending")
                return callback(errors.INVALID_REQUEST_ID); // should never occur

            // update both requests to change status
            request.status = "cancelled";
            requested.status = "cancelled";

            
            var _ = require("lodash");

            _.remove(this.requested, function(el) {
                console.log(">>> ", el.id,requestId);
                return el.id === requestId
            });

            _.remove(user.requests, function(el) {
                console.log("<<< ", el.id,request.id);
                return el.id === request.id
            });

            console.log(">>> ", this.requested);
            console.log("<<<", user.requests);
            console.log(">>> ", this);
            console.log("<<<", user);
            

            // save both users
            user.markModified("requests");
            this.markModified("requested");

            async.parallel({
                me: function(cb) {
                    console.log("save this", this);
                    this.save(cb);
                    console.log("save this done");
                }.bind(this),
                other: function(cb) {
                    console.log("save user", user);
                    user.save(cb);
                    console.log("save user done");
                }
            }, function(err) {
                console.log("ERR ",err);
                if (err) return callback(err);

                // if everything went successfully, send the user to whom the request was made
                // a notification (email or SMS) letting them know the request has been
                // cancelled
                // notify is asynchronous but we don't care about waiting for the result
                user.notify({
                    template: "request_cancelled",
                    data: {
                        requestor: this,
                        requestee: user
                    }
                });

                callback(null, null);
            }.bind(this));

        }.bind(this));

        console.log("cancel request done");
    };

    // close (either accepted or rejected) a pending request made *to* this user
    UserSchema.methods.closeRequest = function(requestId, status, callback) {
        // try and find request in this user
        var request = this.requests.id(requestId);
        if (!request) return callback(errors.INVALID_REQUEST_ID);

        // find request in the other user
        this.constructor.findOne({
            email: request.email
        }, function(err, user) {
            if (err) return callback(err);
            if (!user) return callback(errors.INVALID_REQUEST_ID); // should never occur

            var requested = user.requested.filter(function(req) {
                return req.email === this.email;
            }.bind(this))[0];
            if (typeof requested === "undefined" || requested === null || requested.status !== "pending")
                return callback(errors.INVALID_REQUEST_ID); // should never occur

            // update both requests
            request.status = status;
            requested.status = status;

            // save both users
            user.markModified("requests");
            this.markModified("requested");
            async.parallel({
                me: function(cb) {
                    this.save(cb);
                }.bind(this),
                other: function(cb) {
                    user.save(cb);
                }
            }, function(err) {
                if (err) return callback(err);

                // if everything went successfully, send the user that made the request a
                // notification (either email or SMS) letting them know the status
                // notify is asynchronous but we don't care about waiting for the result
                user.notify({
                    template: "request_closed",
                    data: {
                        requestor: user,
                        requestee: this,
                        action: status
                    }
                });

                callback(null, request);
            }.bind(this));

        }.bind(this));
    };
};
