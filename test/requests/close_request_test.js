"use strict";
var chakram     = require("chakram"),
    curry       = require("curry"),
    Q           = require("q"),
    util        = require("util"),
    querystring = require("querystring"),
    auth        = require("../common/auth.js");

var expect = chakram.expect;

describe("Requests", function () {
    describe("Close Request made to the Current User", function () {
        // delete a request made to a user
        var closeRequest = module.exports.closeRequest = function (data, requestId, accessToken) {
            var url = util.format("http://localhost:3000/v1/requests/%d", requestId);
            return chakram.delete(url, data, auth.genAuthHeaders(accessToken));
        };
    });
});
