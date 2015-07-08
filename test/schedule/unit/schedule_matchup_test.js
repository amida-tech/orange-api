"use strict";
var chai            = require("chai"),
    zerorpc         = require("zerorpc"),
    moment          = require("moment-timezone"),
    Schedule        = require("../../../lib/models/schedule/schedule.js");
var expect = chai.expect;

describe("Schedule", function () {
    describe("matching up predicted and dosing events", function () {
        // connect to zerorpc py matching server
        var client;
        before(function () {
            client = new zerorpc.Client();
            client.connect("tcp://127.0.0.1:4242");
        });

        // TODO: we should probably test this better, but for now we just test it matches up
        // one complicated schedule containing all possible different types of time correctly
        var schedule = new Schedule({
            as_needed: true,
            regularly: true,
            until: { type: "forever" },
            frequency: { n: 1, unit: "day" },
            times: [
                { type: "event", event: "breakfast", when: "before" },
                { type: "event", event: "lunch", when: "after" },
                { type: "event", event: "sleep", when: "before" },
                { type: "exact", time: "16:00" },
                { type: "unspecified" }
            ],
            take_with_food: null,
            take_with_medications: [],
            take_without_medications: []
        });
        // to test both accuracy and speed we craft data to test against over a 3 day window, and
        // then repeat that window many times for a larger amount of data to test with
        var at = function (date, time) {
            var hours = parseInt(time.slice(0, 2));
            var minutes = parseInt(time.slice(2));

            // moments are mutable
            date = moment(date);
            date.hours(hours);
            date.minutes(minutes);
            date.seconds(0);
            date.milliseconds(0);
            return date;
        };
        var windowGenerator = function (day1, day2, day3) {
            // habits:
            //    breakfast: 0930
            //    lunch: 1300
            //    sleep: 0000
            return [
                at(day1, "1000"), // before breakfast day 1
                at(day1, "1700"), // late after lunch day 1
                at(day1, "1800"), // late 16:00 day 1
                at(day1, "2130"), // unspecified day 1
                at(day1, "2200"), // early before sleep day 1

                at(day2, "1000"), // before breakfast day 2
                // at(day2, "1700"), // MISSED after lunch day 2
                at(day2, "1800"), // late 16:00 day 2
                at(day2, "2130"), // unspecified day 1
                at(day2, "2200"), // early before sleep day 2

                at(day3, "1000"), // before breakfast day 3
                at(day3, "1400"), // after lunch day 3
                at(day3, "1500"), // extra as_needed dose day 3
                at(day3, "1700"), // 16:00 day 3
                at(day3, "2130"), // unspecified day 1
                at(day3, "2200")  // early before sleep day 3
            ];
        };

        // loop over a time range to create a larger array of dose times
        var times = [];
        var numberWindows = 1;
        var date = moment().subtract(numberWindows * 3, "days");
        for (var i = 0; i < numberWindows; i++) {
            times = times.concat(windowGenerator(date, moment(date).add(1, "day"), moment(date).add(2, "days")));
            // increment date
            date.add(3, "days");
        }

        // just to make sure any issues are with matchup not the actual schedule
        it("is a valid schedule", function () {
            expect(schedule.isValid()).to.be.true;
        });

        it("matches up correctly", function (done) {
            schedule.match(times, client, {
                tz: "America/New_York",
                wake: "08:00",
                sleep: "00:00",
                breakfast: "09:30",
                lunch: "13:00",
                dinner: "18:00"
            }, function (err, result) {
                console.log(result);
                if (err) return done(err);
                // TODO: some better tests..
                expect(result.length).to.not.equal(0);
                done();
            });
        });
    });
});
