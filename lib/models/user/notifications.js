"use strict";
var async       = require("async"),
    util        = require("util"),
    fs          = require("fs"),
    Handlebars  = require("handlebars"),
    config      = require("../../../config.js");

// require twilio and sendgrid (using vars from config)
var twilio      = require("twilio")(config.text.twilio_sid, config.text.twilio_auth_token),
    sendgrid    = require("sendgrid")(config.email.sendgrid_api_key);

module.exports = function (UserSchema) {
    // generate data to send over email
    var genEmailData = function (data, user, callback) {
        // basic data
        var email = {};
        email.to = user.email;
        email.from = config.email.from;

        // if a template is specified, try and read it's files
        if (typeof data.template === "string") {
            async.parallel({
                body: function (cb) {
                    var path = util.format("./views/%s/email_body.handlebars", data.template);
                    fs.readFile(path, { encoding: "utf8" }, cb);
                },
                subject: function (cb) {
                    var path = util.format("./views/%s/email_subject.handlebars", data.template);
                    fs.readFile(path, { encoding: "utf8" }, cb);
                }
            }, function (err, sources) {
                if (err) return callback(err);

                // data accessible from the templates; at the moment, just the user
                var vars = { user: user };

                // parse the templates with Handlebars and use them to format the email
                email.html = Handlebars.compile(sources.body.trim())(vars);
                email.subject = Handlebars.compile(sources.subject.trim())(vars);
                callback(null, email);
            });
        } else {
            // if a subject has been explicitly specified, use that
            if (typeof data.subject !== "undefined" && data.subject !== null && data.subject.length > 0)
                email.subject = data.subject;
            // otherwise use a sensible default
            else
                email.subject = "Orange Notification";

            // if a message body has been explicitly specified, use that
            if (typeof data.body !== "undefined" && data.body !== null && data.body.length > 0)
                email.html = data.body;
            // otherwise if an SMS body has been specified, use that
            else if (typeof data.text !== "undefined" && data.text !== null && data.text.length > 0)
                email.html = data.text;
            // otherwise use a sensible default
            else
                email.html = "An event occurred inside Orange --- please check the app!";

            callback(null, email);
        }
    };

    // generate data to send over SMS
    var genTextData = function (data, user, callback) {
        // basic data
        var text = {};
        text.to = user.phone;
        text.from = config.text.from;

        // if a template is specified, try and read it's files
        if (typeof data.template === "string") {
            var path = util.format("./views/%s/text.handlebars", data.template);
            fs.readFile(path, { encoding: "utf8" }, function (err, source) {
                if (err) return callback(err);

                // data accessible from the templates; at the moment, just the user
                var vars = { user: user };

                // use template to generate SMS body
                text.body = Handlebars.compile(source.trim())(vars);
                callback(null, text);
            });
        } else {
            // if an SMS body has been specified, use that
            if (typeof data.text !== "undefined" && data.text !== null && data.text.length > 0)
                text.body = data.text;
            // otherwise if an email subject has been specified, use that
            else if (typeof data.subject !== "undefined" && data.subject !== null && data.subject.length > 0)
                text.body = data.subject;
            // otherwise use a sensible default
            else
                text.body = "Orange Notification --- please check the app!";

            callback(null, text);
        }
    };

    // data keys:
    //   subject: used for email
    //   body: used for email
    //   text: used for SMS
    //   template: overrides the above and uses handlebars templates to generate all of the above data
    //      needs the templates: views/:templatename/email_body.handlebars, email_subject.handlebars,
    //      text.handlebars
    UserSchema.methods.notify = function (data, callback) {
        // allow mailer and texter mocks to be passed in for testing
        var mailer = sendgrid, texter = twilio;
        if (typeof data.mailer !== "undefined" && data.mailer !== null) mailer = data.mailer;
        if (typeof data.texter !== "undefined" && data.texter !== null) texter = data.texter;

        // callback is optional: some of the time we don't care about waiting for a message 
        // to be sent
        if (typeof callback === "undefined") callback = function () {};

        // generate email data to be sent
        var user = this;
        async.parallel({
            email: function (cb) {
                genEmailData(data, user, cb);
            },
            text: function (cb) {
                genTextData(data, user, cb);
            }
        }, function (err, messages) {
            if (err) return callback(err);

            // function to send an email notification
            var sendEmail = function () {
                mailer.send(messages.email, function (err) {
                    // errors are SILENTLY logged and ignored
                    if (err) console.error(err);

                    callback(null, {
                        type: "email",
                        success: !err
                    });
                });
            };

            // if we have a phone number for the user
            if (typeof user.phone !== "undefined" && user.phone !== null && user.phone.length > 0) {
                // try and send a text to the user
                return texter.sendMessage(messages.text, function (err) {
                    // if an error ocurred, try sending an email instead
                    if (err) return sendEmail();
                    // otherwise return
                    callback(null, {
                        type: "text",
                        success: true
                    });
                });
            }

            // otherwise send an email
            sendEmail();
        });
    };
};
