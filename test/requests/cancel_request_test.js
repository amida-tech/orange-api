"use strict";
var chakram     = require("chakram"),
    curry       = require("curry"),
    Q           = require("q"),
    util        = require("util"),
    querystring = require("querystring"),
    auth        = require("../common/auth.js");

var expect = chakram.expect;

describe("Requests", function () {
    describe("Cancelling a Request Made by the Current User", function () {
        // delete a request made by a user
        var cancelRequest = module.exports.cancelRequest = function (requestId, accessToken) {
            var url = util.format("http://localhost:3000/v1/requested/%d", requestId);
            return chakram.delete(url, {}, auth.genAuthHeaders(accessToken));
        };
    });
});
