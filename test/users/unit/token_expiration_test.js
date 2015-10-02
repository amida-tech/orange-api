"use strict";
var async       = require("async"),
    mongoose    = require("mongoose"),
    chai        = require("chai"),
    sinon       = require("sinon"),
    Q           = require("q"),
    fixtures    = require("../fixtures.js"),
    errors      = require("../../../lib/errors.js").ERRORS;

var expect = chai.expect;

describe("Users", function () {
    describe("Tokens expire after 5 tokens created", function () {
        // setup user
        var user;
        before(function () {
            return fixtures.create("User").then(function (u) {
                user = u;
            });
        });

        // update user from db and return tokens
        var getTokens = function () {
            var User = mongoose.model("User");
            return Q.nbind(User.findById, User)(user._id).then(function (u) {
                return u.tokens;
            });
        };
        // count tokens
        var checkTokens = function (count) {
            return getTokens().then(function (tokens) {
                expect(tokens.length).to.equal(count);
            });
        };

        // generate and save new token
        var generateToken = function () {
            return Q.nbind(user.generateSaveAccessToken, user)();
        };

        it("initially has 0 tokens", function () {
            return checkTokens(0);
        });

        var oldest, newest;
        describe("with 5 tokens generated", function () {
            before(function () {
                return generateToken().then(function (t) {
                    oldest = t;
                });
            });
            before(generateToken);
            before(generateToken);
            before(generateToken);
            before(function () {
                return generateToken().then(function (t) {
                    newest = t;
                });
            });

            it("has 5 tokens", function () {
                return checkTokens(5);
            });
        });

        describe("with a 6th token generated", function () {
            before(generateToken);

            it("still has 5 tokens", function () {
                return checkTokens(5);
            });

            it("removed the first token", function () {
                return getTokens().then(function (tokens) {
                    expect(tokens).to.not.include(oldest);
                    expect(tokens).to.include(newest);
                });
            });
        });
    });
});
