"use strict";
var expect = require("chai").expect,
    async  = require("async"),
    util   = require("util");

var responses = module.exports = {};

responses.isASuccessfulResponse = function (responseCode, keys) {
    it("has response code " + responseCode, function () {
        expect(this.res.status).to.equal(responseCode);
    });

    it("contains success=true in the response body", function () {
        expect(this.res.body.success).to.equal(true);
    });

    /*eslint-disable no-loop-func */
    for (var i = 0; i < keys.length; i++) {
        (function(key) {
            it(util.format("contains key '%s' in the response body", key), function () {
                expect(this.res.body).to.include.keys(key);
            });
        })(keys[i]);
    }
    /*eslint-enable no-loop-func */

    it("does not contain any extra keys", function () {
        var resKeys = Object.keys(this.res.body);
        for (var i = 0; i < resKeys.length; i++) {
            // ignore success and error keys
            if (resKeys[i] === "success" || resKeys[i] === "error") continue;
            expect(keys).to.include(resKeys[i]);
        }
    });
};

responses.isAFailedResponse = function (responseCode, errors) {
    it("has response code " + responseCode, function () {
        expect(this.res.status).to.equal(responseCode);
    });

    it("contains success=false in the response body", function () {
        expect(this.res.body.success).to.equal(false);
    });

    it("contains exactly keys 'errors' and 'success' in the response body", function() {
        expect(Object.keys(this.res.body).sort()).to.eql(['errors', 'success'].sort())
    });

    it(util.format("contains exactly the errors %j", errors), function () {
        expect(this.res.body.errors.sort()).to.eql(errors.sort());
    });
}

// 201 success status for create POST
responses.isASuccessfulCreateResponse = async.apply(responses.isASuccessfulResponse, 201);
responses.isAFailedCreateResponse = responses.isAFailedResponse;

// 200 success status for all other crud methods
responses.isASuccessfulShowResponse = async.apply(responses.isASuccessfulResponse, 200);
responses.isAFailedShowResponse = responses.isAFailedResponse;
responses.isASuccessfulEditResponse = async.apply(responses.isASuccessfulResponse, 200);
responses.isAFailedEditResponse = responses.isAFailedResponse;
responses.isASuccessfulDeleteResponse = async.apply(responses.isASuccessfulResponse, 200);
responses.isAFailedDeleteResponse = responses.isAFailedResponse;
