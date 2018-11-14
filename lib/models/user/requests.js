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
                    const fullName = this.firstName + " " + this.lastName;
                    // const pushMessage = `${fullName} has requested access to your record`; // TODO ARH: After legal consult, potentially change the body back to this.
                    const pushMessage = "Someone has requested access to your record.";
                    user.sendPushNotification({
                        notificationType: "NEW_REQUEST",
                        // title: "New Request", // TODO ARH: After legal consult, potentially change the title back to this.
                        title: "Notification:",
                        body: pushMessage
                    });
                    callback(null, request);
                }.bind(this));
            }.bind(this));
        }.bind(this));
    };

    UserSchema.methods.getFirstAndLastName = function(email, callback){
         // check an email address has been specified
         if (typeof email === "undefined" || email === null || email.length === 0)
            return callback(errors.EMAIL_REQUIRED);

        this.constructor.findOne({
            email: email
        }, function(err, user){
            if (err) return callback(err);
            if (!user) return callback(errors.INVALID_EMAIL); // no user found for that email
            const first_name = user.firstName;
            const last_name = user.lastName;
            callback(null, {first_name, last_name});
        });
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

            // remove both requests
            request.remove();
            requested.remove();

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

                callback(null, requested);
            }.bind(this));

        }.bind(this));
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

                const fullName = this.firstName + " " + this.lastName;
                user.sendPushNotification({
                    notificationType: "REQUEST_APPROVED",
                    // TODO ARH: After legal consult, potentially change title and body back to these.
                    // title: "Request Approved",
                    // body: `${fullName} has approved your request for access to their record`
                    title: "Notification:",
                    body: "Someone has approved your access request."
                });

                callback(null, request);
            }.bind(this));

        }.bind(this));
    };
};
