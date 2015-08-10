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
                { type: "event", event: "breakfast", when: "before", _id: 10 },
                { type: "event", event: "lunch", when: "after", _id: 11 },
                { type: "event", event: "sleep", when: "before", _id: 12 },
                { type: "exact", time: "16:00", _id: 13 },
                { type: "unspecified", _id: 14 }
            ],
            take_with_food: null,
            take_with_medications: [],
            take_without_medications: []
        });
        // to test both accuracy and speed we craft data to test against over a 3 day window, and
        // then repeat that window many times for a larger amount of data to test with
        var doseId = 0;
        var at = function (date, time, scheduledId, taken) {
            var hours = parseInt(time.slice(0, 2));
            var minutes = parseInt(time.slice(2));

            if (typeof taken !== "boolean") taken = true;

            // moments are mutable
            date = moment(date);
            date.hours(hours);
            date.minutes(minutes);
            date.seconds(0);
            date.milliseconds(0);
            return {
                _id: doseId++,
                date: date,
                taken: taken,
                scheduled: scheduledId
            };
        };
        var windowGenerator = function (day1, day2, day3) {
            // habits:
            //    breakfast: 0930
            //    lunch: 1300
            //    sleep: 0000
            return [
                at(day1, "1000", 10), // before breakfast day 1
                at(day1, "1700", 11), // late after lunch day 1
                at(day1, "1800", 13), // late 16:00 day 1
                at(day1, "2130", 14), // unspecified day 1 (explicitly specified)
                at(day1, "2200", 12), // early before sleep day 1

                at(day2, "1000", 10), // before breakfast day 2
                at(day2, "1700", null, false), // MISSED after lunch day 2
                at(day2, "1800", 13), // late 16:00 day 2
                at(day2, "2130", null), // unspecified day 2 (implicitly specified by no schedule time ID)
                at(day2, "2200", 12), // early before sleep day 2

                at(day3, "1000", 10), // before breakfast day 3
                at(day3, "1400", 11), // after lunch day 3
                at(day3, "1500", null), // unspecified dose day 3
                at(day3, "1700", 13), // 16:00 day 3
                at(day3, "2130", null), // extra as_needed day 3
                at(day3, "2200", 12)  // early before sleep day 3
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
                if (err) return done(err);

                var m = result.matches;
                console.log(m);
                expect(m.length).to.equal(15);

                // check matches as expected
                expect(m[0].match.day).to.equal(0);
                expect(m[0].match.index).to.equal(10);
                expect(m[0].dose).to.equal(0);

                expect(m[1].match.day).to.equal(0);
                expect(m[1].match.index).to.equal(11);
                expect(m[1].dose).to.equal(1);

                expect(m[2].match.day).to.equal(0);
                expect(m[2].match.index).to.equal(13);
                expect(m[2].dose).to.equal(2);

                expect(m[3].match.day).to.equal(0);
                expect(m[3].match.index).to.equal(14);
                expect(m[3].dose).to.equal(3);

                expect(m[4].match.day).to.equal(0);
                expect(m[4].match.index).to.equal(12);
                expect(m[4].dose).to.equal(4);

                expect(m[5].match.day).to.equal(1);
                expect(m[5].match.index).to.equal(10);
                expect(m[5].dose).to.equal(5);

                // dose ID 6 skipped as it wasn't taken

                expect(m[6].match.day).to.equal(1);
                expect(m[6].match.index).to.equal(13);
                expect(m[6].dose).to.equal(7);

                expect(m[7].match.day).to.equal(1);
                expect(m[7].match.index).to.equal(14);
                expect(m[7].dose).to.equal(8);

                expect(m[8].match.day).to.equal(1);
                expect(m[8].match.index).to.equal(12);
                expect(m[8].dose).to.equal(9);

                expect(m[9].match.day).to.equal(2);
                expect(m[9].match.index).to.equal(10);
                expect(m[9].dose).to.equal(10);

                expect(m[10].match.day).to.equal(2);
                expect(m[10].match.index).to.equal(11);
                expect(m[10].dose).to.equal(11);

                expect(m[11].match.day).to.equal(2);
                expect(m[11].match.index).to.equal(14);
                expect(m[11].dose).to.equal(12);

                expect(m[12].match.day).to.equal(2);
                expect(m[12].match.index).to.equal(13);
                expect(m[12].dose).to.equal(13);

                expect(m[13].match).to.be.null;
                expect(m[13].dose).to.equal(14);

                expect(m[14].match.day).to.equal(2);
                expect(m[14].match.index).to.equal(12);
                expect(m[14].dose).to.equal(15);

                done();
            });
        });

        // 1d lists are an edge case for crossovers in the GA so we test explicitly
        // to make sure nothing errors out here
        it("handles matching up when one dose is present", function (done) {
            schedule.match([times[0]], client, {
                tz: "America/New_York",
                wake: "08:00",
                sleep: "00:00",
                breakfast: "09:30",
                lunch: "13:00",
                dinner: "18:00"
            }, function (err, result) {
                if (err) return done(err);
                expect(result.length).to.not.equal(0);
                done();
            });
        });
    });
});
