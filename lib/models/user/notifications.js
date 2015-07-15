"use strict";

var config = require("../../../config.js");

// require twilio and sendgrid (using vars from config)
var twilio      = require("twilio")(config.text.twilio_sid, config.text.twilio_auth_token),
    sendgrid    = require("sendgrid")(config.email.sendgrid_api_key);

module.exports = function (UserSchema) {
    // data keys:
    //   subject: used for email
    //   body: used for email
    //   text: used for SMS

    UserSchema.methods.notify = function (data, callback) {
        // allow mailer and texter mocks to be passed in for testing
        var mailer = sendgrid, texter = twilio;
        if (typeof data.mailer !== "undefined" && data.mailer !== null) mailer = data.mailer;
        if (typeof data.texter !== "undefined" && data.texter !== null) texter = data.texter;

        // email message data
        var emailData = {};
        emailData.to = this.email;
        emailData.from = config.email.from;

        // if a subject has been explicitly specified, use that
        if (typeof data.subject !== "undefined" && data.subject !== null && data.subject.length > 0)
            emailData.subject = data.subject;
        // otherwise use a sensible default
        else
            emailData.subject = "Orange Notification";

        // if a message body has been explicitly specified, use that
        if (typeof data.body !== "undefined" && data.body !== null && data.body.length > 0)
            emailData.text = data.body;
        // otherwise if an SMS body has been specified, use that
        else if (typeof data.text !== "undefined" && data.text !== null && data.text.length > 0)
            emailData.text = data.text;
        // otherwise use a sensible default
        else
            emailData.text = "An event occurred inside Orange --- please check the app!";

        // SMS message data
        var textData = {};
        textData.to = this.phone;
        textData.from = config.text.from;
        // if an SMS body has been specified, use that
        if (typeof data.text !== "undefined" && data.text !== null && data.text.length > 0)
            textData.body = data.text;
        // otherwise if an email subject has been specified, use that
        else if (typeof data.subject !== "undefined" && data.subject !== null && data.subject.length > 0)
            textData.body = data.subject;
        // otherwise use a sensible default
        else
            textData.body = "Orange Notification --- please check the app!";

        // function to send an email notification
        var sendEmail = function () {
            mailer.send(emailData, function (err) {
                // errors are SILENTLY logged and ignored
                if (err) console.error(err);

                callback(null, {
                    type: "email",
                    success: !err
                });
            });
        };

        // if we have a phone number for the user
        if (typeof this.phone !== "undefined" && this.phone !== null && this.phone.length > 0) {
            // try and send a text to the user
            return texter.sendMessage(textData, function (err) {
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
    };
};
