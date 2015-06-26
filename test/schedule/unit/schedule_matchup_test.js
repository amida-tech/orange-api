"use strict";
var chai            = require("chai"),
    zerorpc         = require("zerorpc"),
    ScheduleMatcher = require("../../../lib/models/helpers/schedule_matcher.js");
var expect = chai.expect;

describe("Schedule", function () {
    describe("matching up predicted and dosing events", function () {
        // connect to zerorpc py matching server and create a new ScheduleMatcher
        // instance
        var sm, client;
        before(function () {
            client = new zerorpc.Client();
            client.connect("tcp://127.0.0.1:4242");
            sm = new ScheduleMatcher(client);
        });

        it("returns an object of the expected format", function (done) {
            sm.match([5, 7, 15, 17, 25, 27, 35, 37], [8, 9, 12, 16, 28, 34, 36], function (err, match) {
                if (err) return done(err);
                // for now we just check we get a response with the relevant keys
                expect(match).to.have.keys(["match", "fitness"]);
                done();
            });
        });

        it("should do lots of other things once the schedule format is finalised!");
    });
});
