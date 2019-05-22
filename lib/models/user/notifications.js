"use strict";
var async       = require("async"),
    extend      = require("xtend"),
    util        = require("util"),
    fs          = require("fs"),
    Handlebars  = require("handlebars"),
    config      = require("../../../config.js");

// require twilio and sendgrid (using vars from config)
var twilio      = require("twilio")(config.text.twilio_sid, config.text.twilio_auth_token),
    sendgrid    = require("sendgrid")(config.email.sendgrid_api_key),
    sgHelper    = require("sendgrid").mail;

module.exports = function (UserSchema) {
    // generate data to send over email
    var genEmailData = function (data, user, context, callback) {
        // basic data
        var email = {};
        email.to = user.email;
        email.from = config.email.from;

        context.config = {
            emailVerificationInitPageUrl: config.emailVerificationInitPageUrl
        }

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

                // parse the templates with Handlebars and use them to format the email
                email.html = Handlebars.compile(sources.body.trim())(context);
                email.subject = Handlebars.compile(sources.subject.trim())(context);
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
    var genTextData = function (data, user, context, callback) {
        // allow manually not sending text data
        if (data.sendText === false) {
            return callback(null, null);
        }

        // basic data
        var text = {};
        text.to = user.phone;
        text.from = config.text.from;

        // if a template is specified, try and read it's files
        if (typeof data.template === "string") {
            var path = util.format("./views/%s/text.handlebars", data.template);
            fs.readFile(path, { encoding: "utf8" }, function (err, source) {
                if (err) return callback(err);

                // use template to generate SMS body
                text.body = Handlebars.compile(source.trim())(context);
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
        // callback is optional: some of the time we don't care about waiting for a message
        // to be sent
        if (typeof callback === "undefined") {
            callback = function () {};
        }

        // unless mailer and texter mocks have been explicitly specified (for unit testing notifications),
        // we don't send notifications in testing
        var mailerPassed = (typeof data.mailer !== "undefined") && (data.mailer !== null);
        var texterPassed = (typeof data.texter !== "undefined") && (data.texter !== null);
        if ((process.env.NODE_ENV === "test") && (!mailerPassed || !texterPassed)) return callback();

        // allow mailer and texter mocks to be passed in for testing
        var mailer = sendgrid, texter = twilio;
        if (mailerPassed) mailer = data.mailer;
        if (texterPassed) texter = data.texter;

        // generate email data to be sent
        var user = this;
        // data to be rendered in handlebars templates
        var context = extend({
            user: user
        }, data.data);
        async.parallel({
            email: function (cb) {
                genEmailData(data, user, context, cb);
            },
            text: function (cb) {
                genTextData(data, user, context, cb);
            }
        }, function (err, messages) {
            if (err) return callback(err);

            var mail = new sgHelper.Mail(
                new sgHelper.Email(messages.email.from),
                messages.email.subject,
                new sgHelper.Email(messages.email.to),
                new sgHelper.Content('text/html', messages.email.html));

            var sgRequest = mailer.emptyRequest({
              method: 'POST',
              path: '/v3/mail/send',
              body: mail.toJSON()
            });

            // function to send an email notification
            var sendEmail = function () {
                mailer.API(sgRequest, function (err) {
                    // errors are SILENTLY logged and ignored
                    if (err) {
                        console.log("Error sending email: ", err);
                        console.log(err.response.body.errors);
                    }

                    callback(null, {
                        type: "email",
                        success: !err
                    });
                });
            };

            // if this is an email-only notification
            if (messages.text === null) return sendEmail();

            // otherwsise if we have a phone number for the user
            if (typeof user.phone !== "undefined" && user.phone !== null && user.phone.length > 0) {
                // try and send a text to the user
                return texter.messages.create(messages.text).then(() => {
                    callback(null, {
                        type: "text",
                        success: true
                    });
                }).catch(() => {
                    // if an error ocurred, try sending an email instead
                    return sendEmail();
                });
            }

            // otherwise send an email
            sendEmail();
        });
    };
};
