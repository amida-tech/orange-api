"use strict";
var chakram     = require("chakram"),
    Q           = require("q"),
    sinon       = require("sinon"),
    auth        = require("../../common/auth.js");

var expect = chakram.expect;

describe("Users", function () {
    describe("Notifications", function () {
        // setup a user to test with
        var user;
        before(function () {
            return auth.createTestUser({}).then(function (u) {
                user = u;
            });
        });

        // spy to be used in mailer and texter so we can check if it's called
        var mailSpy, textSpy;
        before(function () {
            mailSpy = sinon.spy();
            textSpy = sinon.spy();
        });
        beforeEach(function () {
            mailSpy.reset();
            textSpy.reset();
        });

        // set the user's email address and phone number to the specified values
        // then notify with the specified data
        var notify = function (email, phone, data) {
            // mock mailer so we don't make actual sendgrid requests
            data.mailer = {
                send: function (details, callback) {
                    mailSpy(details);
                    callback();
                }
            };
            // and likewise with texter (sends SMS') so we don't make actual twilio requests
            data.texter = {
                sendMessage: function (details, callback) {
                    // very rudimentary validation of phone numbers to check handling of invalid
                    // phone numbers
                    var phone = details.to;
                    // regex checks no non-numeric characters are present
                    if (typeof phone === "undefined" || phone === null || phone.match(/[^\d]/i))
                        return callback(new Error("Invalid phone number"));

                    textSpy(details);
                    callback();
                }
            };

            var deferred = Q.defer();
            user.email = email;
            user.phone = phone;
            user.save(function (err) {
                if (err) return deferred.reject(err);
                user.notify(data, function (err, response) {
                    if (err) return deferred.reject(err);
                    deferred.resolve(response);
                });
            });
            return deferred.promise;
        };

        // wrapper around notify using mailSpy to check that exactly one
        // email was sent and return the data
        var notifyMail = function (email, phone, data) {
            return notify(email, phone, data).then(function (response) {
                // exactly one email should have been sent
                expect(mailSpy.callCount).to.equal(1);
                expect(response.type).to.equal("email");
                expect(response.success).to.be.true;
                // and no texts
                expect(textSpy.callCount).to.equal(0);
                // data passed to mailSpy
                return mailSpy.args[0][0];
            });
        };

        // wrapper around notify using textSpy to check that exactly one
        // SMS was sent and return the data
        var notifyText = function (email, phone, data) {
            return notify(email, phone, data).then(function (response) {
                // exactly one SMS should have been sent
                expect(textSpy.callCount).to.equal(1);
                expect(response.type).to.equal("text");
                expect(response.success).to.be.true;
                // and no emails
                expect(mailSpy.callCount).to.equal(0);
                // data passed to textSpy
                return textSpy.args[0][0];
            });
        };

        it("sends emails by default", function () {
            return notifyMail("testuser@amida-demo.com", "", {}).then(function (data) {
                // should send to the right email
                expect(data.to).to.equal("testuser@amida-demo.com");
                // should come from an email address
                expect(data.from).to.be.a("string");
                expect(data.from.length).to.be.above(0);
                // should have a default subject
                expect(data.subject).to.be.a("string");
                expect(data.subject.length).to.be.above(0);
                // should have a default body
                expect(data.text).to.be.a("string");
                expect(data.text.length).to.be.above(0);
            });
        });

        it("allows a custom email subject and body", function () {
            return notifyMail("testuser@amida-demo.com", "", {
                subject: "testsubject",
                body: "testbody"
            }).then(function (data) {
                expect(data.subject).to.equal("testsubject");
                expect(data.text).to.equal("testbody");
            });
        });

        it("sends texts if a valid phone number is present", function () {
            return notifyText("testuser@amida-demo.com", "6176170000", {}).then(function (data) {
                // should send to the right phone number
                expect(data.to).to.equal("6176170000");
                // should come from a phone number
                expect(data.from).to.be.a("string");
                expect(data.from.length).to.be.above(0);
                // should have a default body
                expect(data.body).to.be.a("string");
                expect(data.body.length).to.be.above(0);
            });
        });

        it("allows a custom SMS text", function () {
            return notifyText("testuser@amida-demo.com", "6176170000", {
                text: "testtext"
            }).then(function (data) {
                expect(data.body).to.equal("testtext");
            });
        });

        it("sends emails if an invalid phone number is specified", function () {
            return notifyMail("testuser@amida-demo.com", "foobar", {
                body: "testbody",
                subject: "testsubject",
                text: "testtext"
            }).then(function (data) {
                // should send to the right email address
                expect(data.to).to.equal("testuser@amida-demo.com");
                // should come from an email address
                expect(data.from).to.be.a("string");
                expect(data.from.length).to.be.above(0);
                // should have the correct subject and body
                expect(data.subject).to.equal("testsubject");
                // should have the specified body
                expect(data.text).to.equal("testbody");
            });
        });

        it("sends emails with content based on the SMS data if an invalid phone number is specified", function () {
            return notifyMail("testuser@amida-demo.com", "foobar", {
                text: "testtext"
            }).then(function (data) {
                // should send to the right email address
                expect(data.to).to.equal("testuser@amida-demo.com");
                // should come from an email address
                expect(data.from).to.be.a("string");
                expect(data.from.length).to.be.above(0);
                // should have a default subject
                expect(data.subject).to.be.a("string");
                expect(data.subject.length).to.be.above(0);
                // should have a default body
                expect(data.text).to.equal("testtext");
            });
        });
    });
});
