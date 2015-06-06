"use strict";
var mongoose = require("mongoose"),
    expect   = require("chai").expect,
    async    = require("async"),
    requests = require("./requests.js"),
    app      = require("../../app.js");

module.exports = function Crud (className) {
    this.model = mongoose.model(className);

    // keep track of count of records
    this.count = 0;
    this.countFunc = function (callback) {
        this.model.count(function(err, count) {
            if (err) return callback(err);
            this.count = count;
            callback();
        }.bind(this));
    };
    // check count has been updated by a certain amount
    this.checkCount = function (delta, callback) {
        this.model.count(function(err, count) {
            if (err) return callback(err);
            expect(count).to.eql(this.count + delta);
            callback();
        }.bind(this));
    };

    // check a resource is created and returned
    this.successfullyCreates = function (endpoint, data, keys) {
        before(this.countFunc.bind(this));

        // check REST response
        describe("the response", function() {
            requests.successfullyCreates(endpoint, data, keys);
        });

        describe("the database", function() {
            // check a record was inserted
            it("has a new record inserted", function (done) {
                this.checkCount(1, done);
            }.bind(this));
        }.bind(this));
    };

    // check a resource is not created and an appropriate error response
    // is returned
    this.failsToCreate = function (endpoint, data, responseCode, errors) {
        before(this.countFunc.bind(this));

        // check REST response
        describe("the response", function() {
            requests.failsToCreate(endpoint, data, responseCode, errors);
        });

        describe("the database", function() {
            // check a record was not inserted
            it("has the same number of items", function (done) {
                this.checkCount(0, done);
            }.bind(this));
        }.bind(this));
    };

    // check a resource is modified and returned
    this.successfullyEdits = function (endpoint, data, keys, accessToken) {
        // check REST response
        describe("the response", function() {
            requests.successfullyEdits(endpoint, data, keys, accessToken);
        });
    }
    
    // check a resource is not modified and an appropriate error response code
    // is returned
    this.failsToEdit = function (endpoint, data, responseCode, errors, accessToken) {
        // check REST response
        describe("the response", function() {
            requests.failsToEdit(endpoint, data, responseCode, errors, accessToken);
        });
    }

    this.successfullyShows = requests.successfullyShows;
    this.failsToShow = requests.failsToShow;

    return this;
}
