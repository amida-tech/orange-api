"use strict";
var chai            = require("chai"),
    Schedule        = require("../../../lib/models/schedule/schedule.js");
var expect = chai.expect;

describe("Schedule", function () {
    describe("validates schedules correctly", function () {
        // verify schedule is valid and Schedule object has the expected output
        var acceptsManual = function (data, output) {
            var schedule = new Schedule(data);
            expect(schedule.isValid()).to.be.true;
            expect(schedule.toObject()).to.deep.equal(output);
        };
        // verify schedule is valid and Schedule object has the same output
        // as input
        var accepts = function (data) {
            return acceptsManual(data, data);
        };
        // verify schedule is invalid
        var rejects = function (data) {
            var schedule = new Schedule(data);
            expect(schedule.isValid()).to.be.false;
        };

        it("allows a null schedule", function () {
            return acceptsManual(null, {
                as_needed: true,
                regularly: false
            });
        });

        it("allows an empty schedule", function () {
            return acceptsManual({}, {
                as_needed: true,
                regularly: false
            });
        });

        it("rejects non-object schedules", function () {
            return rejects("foo");
        });

        it("rejects schedules that are never taken", function () {
            return rejects({
                as_needed: false,
                regularly: false
            });
        });

        it("accepts as_needed only schedules", function () {
            return accepts({
                as_needed: true,
                regularly: false
            });
        });

        it("accepts schedules that are taken as_needed and regularly", function () {
            return accepts({
                as_needed: true,
                regularly: true,
                until: { type: "forever" },
                frequency: { n: 1, unit: "day" },
                times: [{ type: "unspecified" }],
                take_with_food: null,
                take_with_medications: [],
                take_without_medications: []
            });
        });

        it("rejects schedules with an invalid as_needed key", function () {
            return rejects({
                as_needed: "foo",
                regularly: true
            });
        });

        it("rejects schedules with a null as_needed key", function () {
            return rejects({
                as_needed: null,
                regularly: true
            });
        });

        it("rejects schedules with an invalid regularly key", function () {
            return rejects({
                regularly: "foo",
                as_needed: true
            });
        });

        it("rejects schedules with a null regularly key", function () {
            return rejects({
                regularly: null,
                as_needed: true
            });
        });

        describe("'until' key", function () {
            it("rejects a null value", function () {
                return rejects({
                    as_needed: false,
                    regularly: true,
                    until: null,
                    frequency: { n: 1, unit: "day" },
                    times: [{ type: "unspecified" }],
                    take_with_food: null,
                    take_with_medications: [],
                    take_without_medications: []
                });
            });

            it("requires it for regular schedule types", function () {
                return rejects({
                    as_needed: false,
                    regularly: true,
                    frequency: { n: 1, unit: "day" },
                    times: [{ type: "unspecified" }],
                    take_with_food: null,
                    take_with_medications: [],
                    take_without_medications: []
                });
            });

            it("rejects a non-object value", function () {
                return rejects({
                    as_needed: false,
                    regularly: true,
                    until: "foo",
                    frequency: { n: 1, unit: "day" },
                    times: [{ type: "unspecified" }],
                    take_with_food: null,
                    take_with_medications: [],
                    take_without_medications: []
                });
            });

            it("rejects an empty object", function () {
                return rejects({
                    as_needed: false,
                    regularly: true,
                    until: {},
                    frequency: { n: 1, unit: "day" },
                    times: [{ type: "unspecified" }],
                    take_with_food: null,
                    take_with_medications: [],
                    take_without_medications: []
                });
            });

            it("accepts In Perpetuity schedules", function () {
                return accepts({
                    as_needed: false,
                    regularly: true,
                    until: { type: "forever" },
                    frequency: { n: 1, unit: "day" },
                    times: [{ type: "unspecified" }],
                    take_with_food: null,
                    take_with_medications: [],
                    take_without_medications: []
                });
            });

            it("rejects In perpetuity schedules with a date stop key", function () {
                return rejects({
                    as_needed: false,
                    regularly: true,
                    until: { type: "forever", stop: "2015-08-08" },
                    frequency: { n: 1, unit: "day" },
                    times: [{ type: "unspecified" }],
                    take_with_food: null,
                    take_with_medications: [],
                    take_without_medications: []
                });
            });

            it("rejects In perpetuity schedules with a numeric stop key", function () {
                return rejects({
                    as_needed: false,
                    regularly: true,
                    until: { type: "forever", stop: 5 },
                    frequency: { n: 1, unit: "day" },
                    times: [{ type: "unspecified" }],
                    take_with_food: null,
                    take_with_medications: [],
                    take_without_medications: []
                });
            });

            it("accepts {Number} of times schedules", function () {
                return accepts({
                    as_needed: false,
                    regularly: true,
                    until: { type: "number", stop: 5 },
                    frequency: { n: 1, unit: "day" },
                    times: [{ type: "unspecified" }],
                    take_with_food: null,
                    take_with_medications: [],
                    take_without_medications: []
                });
            });
            it("rejects {Number} of times schedules with no number", function () {
                return rejects({
                    as_needed: false,
                    regularly: true,
                    until: { type: "number" },
                    frequency: { n: 1, unit: "day" },
                    times: [{ type: "unspecified" }],
                    take_with_food: null,
                    take_with_medications: [],
                    take_without_medications: []
                });
            });
            it("rejects {Number} of times schedules with an invalid number", function () {
                return rejects({
                    as_needed: false,
                    regularly: true,
                    until: { type: "number", stop: "foo" },
                    frequency: { n: 1, unit: "day" },
                    times: [{ type: "unspecified" }],
                    take_with_food: null,
                    take_with_medications: [],
                    take_without_medications: []
                });
            });
            it("rejects {Number} of times schedules with a date number", function () {
                return rejects({
                    as_needed: false,
                    regularly: true,
                    until: { type: "number", stop: "2015-08-08" },
                    frequency: { n: 1, unit: "day" },
                    times: [{ type: "unspecified" }],
                    take_with_food: null,
                    take_with_medications: [],
                    take_without_medications: []
                });
            });
            it("rejects {Number} of times schedules with a null number", function () {
                return rejects({
                    as_needed: false,
                    regularly: true,
                    until: { type: "number", stop: null },
                    frequency: { n: 1, unit: "day" },
                    times: [{ type: "unspecified" }],
                    take_with_food: null,
                    take_with_medications: [],
                    take_without_medications: []
                });
            });
            it("rejects {Number} of times schedules with a negative number", function () {
                return rejects({
                    as_needed: false,
                    regularly: true,
                    until: { type: "number", stop: -1 },
                    frequency: { n: 1, unit: "day" },
                    times: [{ type: "unspecified" }],
                    take_with_food: null,
                    take_with_medications: [],
                    take_without_medications: []
                });
            });
            it("rejects {Number} of times schedules with a non-integer number", function () {
                return rejects({
                    as_needed: false,
                    regularly: true,
                    until: { type: "number", stop: 1.5 },
                    frequency: { n: 1, unit: "day" },
                    times: [{ type: "unspecified" }],
                    take_with_food: null,
                    take_with_medications: [],
                    take_without_medications: []
                });
            });

            it("accepts Until {Date} schedules", function () {
                return accepts({
                    as_needed: false,
                    regularly: true,
                    until: { type: "date", stop: "2015-08-08" },
                    frequency: { n: 1, unit: "day" },
                    times: [{ type: "unspecified" }],
                    take_with_food: null,
                    take_with_medications: [],
                    take_without_medications: []
                });
            });

            it("rejects Until {Date} schedules with no date", function () {
                return rejects({
                    as_needed: false,
                    regularly: true,
                    until: { type: "date" },
                    frequency: { n: 1, unit: "day" },
                    times: [{ type: "unspecified" }],
                    take_with_food: null,
                    take_with_medications: [],
                    take_without_medications: []
                });
            });

            it("rejects Until {Date} schedules with a null date", function () {
                return rejects({
                    as_needed: false,
                    regularly: true,
                    until: { type: "date" },
                    frequency: { n: 1, unit: null },
                    times: [{ type: "unspecified" }],
                    take_with_food: null,
                    take_with_medications: [],
                    take_without_medications: []
                });
            });

            it("rejects Until {Date} schedules with a numeric date", function () {
                return rejects({
                    as_needed: false,
                    regularly: true,
                    until: { type: "date", stop: 5 },
                    frequency: { n: 1, unit: "day" },
                    times: [{ type: "unspecified" }],
                    take_with_food: null,
                    take_with_medications: [],
                    take_without_medications: []
                });
            });

            it("rejects Until {Date} schedules with an invalid date", function () {
                return rejects({
                    as_needed: false,
                    regularly: true,
                    until: { type: "date", stop: "foo" },
                    frequency: { n: 1, unit: "day" },
                    times: [{ type: "unspecified" }],
                    take_with_food: null,
                    take_with_medications: [],
                    take_without_medications: []
                });
            });

            it("rejects schedules with an extra key present", function () {
                return rejects({
                    as_needed: false,
                    regularly: true,
                    until: { type: "forever", foo: "bar" },
                    frequency: { n: 1, unit: "day" },
                    times: [{ type: "unspecified" }],
                    take_with_food: null,
                    take_with_medications: [],
                    take_without_medications: []
                });
            });
        });

        describe("'frequency' key", function () {
            it("accepts daily medicines", function () {
                return accepts({
                    as_needed: false,
                    regularly: true,
                    until: { type: "forever" },
                    frequency: { n: 1, unit: "day" },
                    times: [{ type: "unspecified" }],
                    take_with_food: null,
                    take_with_medications: [],
                    take_without_medications: []
                });
            });

            it("accepts weekday-only medicines", function () {
                return accepts({
                    as_needed: false,
                    regularly: true,
                    until: { type: "forever" },
                    frequency: { n: 1, unit: "day", exclude: { exclude: [5, 6], repeat: 7 } },
                    times: [{ type: "unspecified" }],
                    take_with_food: null,
                    take_with_medications: [],
                    take_without_medications: []
                });
            });

            it("accepts weekly medicines", function () {
                return accepts({
                    as_needed: false,
                    regularly: true,
                    until: { type: "forever" },
                    frequency: { n: 7, unit: "day" },
                    times: [{ type: "unspecified" }],
                    take_with_food: null,
                    take_with_medications: [],
                    take_without_medications: []
                });
            });

            it("accepts 28-daily medicines", function () {
                return accepts({
                    as_needed: false,
                    regularly: true,
                    until: { type: "forever" },
                    frequency: { n: 28, unit: "day" },
                    times: [{ type: "unspecified" }],
                    take_with_food: null,
                    take_with_medications: [],
                    take_without_medications: []
                });
            });

            it("accepts monthly medicines", function () {
                return accepts({
                    as_needed: false,
                    regularly: true,
                    until: { type: "forever" },
                    frequency: { n: 1, unit: "month" },
                    times: [{ type: "unspecified" }],
                    take_with_food: null,
                    take_with_medications: [],
                    take_without_medications: []
                });
            });

            it("accepts quarterly medicines", function () {
                return accepts({
                    as_needed: false,
                    regularly: true,
                    until: { type: "forever" },
                    frequency: { n: 3, unit: "month" },
                    times: [{ type: "unspecified" }],
                    take_with_food: null,
                    take_with_medications: [],
                    take_without_medications: []
                });
            });

            it("accepts quarterly-except-from-last-quarter medicines", function () {
                return accepts({
                    as_needed: false,
                    regularly: true,
                    until: { type: "forever" },
                    frequency: { n: 3, unit: "month", exclude: { exclude: [3], repeat: 4 } },
                    times: [{ type: "unspecified" }],
                    take_with_food: null,
                    take_with_medications: [],
                    take_without_medications: []
                });
            });

            it("accepts yearly medicines", function () {
                return accepts({
                    as_needed: false,
                    regularly: true,
                    until: { type: "forever" },
                    frequency: { n: 1, unit: "year" },
                    times: [{ type: "unspecified" }],
                    take_with_food: null,
                    take_with_medications: [],
                    take_without_medications: []
                });
            });

            it("rejects frequencies with no 'n' key", function () {
                return rejects({
                    as_needed: false,
                    regularly: true,
                    until: { type: "forever" },
                    frequency: { unit: "day" },
                    times: [{ type: "unspecified" }],
                    take_with_food: null,
                    take_with_medications: [],
                    take_without_medications: []
                });
            });

            it("rejects frequencies with a null 'n' key", function () {
                return rejects({
                    as_needed: false,
                    regularly: true,
                    until: { type: "forever" },
                    frequency: { n: null, unit: "day" },
                    times: [{ type: "unspecified" }],
                    take_with_food: null,
                    take_with_medications: [],
                    take_without_medications: []
                });
            });

            it("rejects frequencies with an invalid 'n' key", function () {
                return rejects({
                    as_needed: false,
                    regularly: true,
                    until: { type: "forever" },
                    frequency: { n: "foo", unit: "day" },
                    times: [{ type: "unspecified" }],
                    take_with_food: null,
                    take_with_medications: [],
                    take_without_medications: []
                });
            });

            it("rejects frequencies with a zero 'n' key", function () {
                return rejects({
                    as_needed: false,
                    regularly: true,
                    until: { type: "forever" },
                    frequency: { n: 0, unit: "day" },
                    times: [{ type: "unspecified" }],
                    take_with_food: null,
                    take_with_medications: [],
                    take_without_medications: []
                });
            });

            it("rejects frequencies with a negative 'n' key", function () {
                return rejects({
                    as_needed: false,
                    regularly: true,
                    until: { type: "forever" },
                    frequency: { n: -1, unit: "day" },
                    times: [{ type: "unspecified" }],
                    take_with_food: null,
                    take_with_medications: [],
                    take_without_medications: []
                });
            });

            it("rejects frequencies with a non-integer 'n' key", function () {
                return rejects({
                    as_needed: false,
                    regularly: true,
                    until: { type: "forever" },
                    frequency: { n: 1.5, unit: "day" },
                    times: [{ type: "unspecified" }],
                    take_with_food: null,
                    take_with_medications: [],
                    take_without_medications: []
                });
            });

            it("rejects frequencies with no 'unit' key", function () {
                return rejects({
                    as_needed: false,
                    regularly: true,
                    until: { type: "forever" },
                    frequency: { n: 1 },
                    times: [{ type: "unspecified" }],
                    take_with_food: null,
                    take_with_medications: [],
                    take_without_medications: []
                });
            });

            it("rejects frequencies with a null 'unit' key", function () {
                return rejects({
                    as_needed: false,
                    regularly: true,
                    until: { type: "forever" },
                    frequency: { n: 1, unit: null },
                    times: [{ type: "unspecified" }],
                    take_with_food: null,
                    take_with_medications: [],
                    take_without_medications: []
                });
            });

            it("rejects frequencies with an invalid 'unit' key", function () {
                return rejects({
                    as_needed: false,
                    regularly: true,
                    until: { type: "forever" },
                    frequency: { n: 1, unit: "fo" },
                    times: [{ type: "unspecified" }],
                    take_with_food: null,
                    take_with_medications: [],
                    take_without_medications: []
                });
            });

            it("rejects frequencies with an extra key", function () {
                return rejects({
                    as_needed: false,
                    regularly: true,
                    until: { type: "forever" },
                    frequency: { n: 1, unit: "day", foo: "bar" },
                    times: [{ type: "unspecified" }],
                    take_with_food: null,
                    take_with_medications: [],
                    take_without_medications: []
                });
            });

            it("allows frequencies with a null 'exclude' key", function () {
                return accepts({
                    as_needed: false,
                    regularly: true,
                    until: { type: "forever" },
                    frequency: { n: 1, unit: "day", exclude: null },
                    times: [{ type: "unspecified" }],
                    take_with_food: null,
                    take_with_medications: [],
                    take_without_medications: []
                });
            });

            it("allows frequencies with an empty 'exclude' key", function () {
                return accepts({
                    as_needed: false,
                    regularly: true,
                    until: { type: "forever" },
                    frequency: { n: 1, unit: "day", exclude: {} },
                    times: [{ type: "unspecified" }],
                    take_with_food: null,
                    take_with_medications: [],
                    take_without_medications: []
                });
            });

            it("rejects frequencies with an 'exclude.exclude' key but no 'exclude.repeat' key", function () {
                return rejects({
                    as_needed: false,
                    regularly: true,
                    until: { type: "forever" },
                    frequency: { n: 1, unit: "day", exclude: {exclude: []} },
                    times: [{ type: "unspecified" }],
                    take_with_food: null,
                    take_with_medications: [],
                    take_without_medications: []
                });
            });

            it("rejects frequencies with an 'exclude.repeat' key but no 'exclude.exclude' key", function () {
                return rejects({
                    as_needed: false,
                    regularly: true,
                    until: { type: "forever" },
                    frequency: { n: 1, unit: "day", exclude: {repeat: 2} },
                    times: [{ type: "unspecified" }],
                    take_with_food: null,
                    take_with_medications: [],
                    take_without_medications: []
                });
            });

            it("allows frequencies with an empty 'exclude.exclude' key", function () {
                return accepts({
                    as_needed: false,
                    regularly: true,
                    until: { type: "forever" },
                    frequency: { n: 1, unit: "day", exclude: {exclude: [], repeat: 2} },
                    times: [{ type: "unspecified" }],
                    take_with_food: null,
                    take_with_medications: [],
                    take_without_medications: []
                });
            });

            it("rejects frequencies with a null 'exclude.exclude' key", function () {
                return rejects({
                    as_needed: false,
                    regularly: true,
                    until: { type: "forever" },
                    frequency: { n: 1, unit: "day", exclude: {exclude: null, repeat: 2} },
                    times: [{ type: "unspecified" }],
                    take_with_food: null,
                    take_with_medications: [],
                    take_without_medications: []
                });
            });

            it("rejects frequencies with an invalid 'exclude.exclude' key", function () {
                return rejects({
                    as_needed: false,
                    regularly: true,
                    until: { type: "forever" },
                    frequency: { n: 1, unit: "day", exclude: {exclude: "foo", repeat: 2} },
                    times: [{ type: "unspecified" }],
                    take_with_food: null,
                    take_with_medications: [],
                    take_without_medications: []
                });
            });

            it("rejects frequencies with a non-array 'exclude.exclude' key", function () {
                return rejects({
                    as_needed: false,
                    regularly: true,
                    until: { type: "forever" },
                    frequency: { n: 1, unit: "day", exclude: {exclude: 1, repeat: 2} },
                    times: [{ type: "unspecified" }],
                    take_with_food: null,
                    take_with_medications: [],
                    take_without_medications: []
                });
            });

            it("rejects frequencies with non-numeric 'exclude.exclude' entries", function () {
                return rejects({
                    as_needed: false,
                    regularly: true,
                    until: { type: "forever" },
                    frequency: { n: 1, unit: "day", exclude: {exclude: [1, "foo"], repeat: 2} },
                    times: [{ type: "unspecified" }],
                    take_with_food: null,
                    take_with_medications: [],
                    take_without_medications: []
                });
            });

            it("rejects frequencies with negative 'exclude.exclude' entries", function () {
                return rejects({
                    as_needed: false,
                    regularly: true,
                    until: { type: "forever" },
                    frequency: { n: 1, unit: "day", exclude: {exclude: [1, -1], repeat: 2} },
                    times: [{ type: "unspecified" }],
                    take_with_food: null,
                    take_with_medications: [],
                    take_without_medications: []
                });
            });

            it("allows frequencies with zero 'exclude.exclude' entries", function () {
                return accepts({
                    as_needed: false,
                    regularly: true,
                    until: { type: "forever" },
                    frequency: { n: 1, unit: "day", exclude: {exclude: [1, 0], repeat: 2} },
                    times: [{ type: "unspecified" }],
                    take_with_food: null,
                    take_with_medications: [],
                    take_without_medications: []
                });
            });

            it("rejects frequencies with non-integral 'exclude.exclude' entries", function () {
                return rejects({
                    as_needed: false,
                    regularly: true,
                    until: { type: "forever" },
                    frequency: { n: 1, unit: "day", exclude: {exclude: [1, 0.5], repeat: 2} },
                    times: [{ type: "unspecified" }],
                    take_with_food: null,
                    take_with_medications: [],
                    take_without_medications: []
                });
            });

            it("rejects frequencies with a null 'exclude.repeat' key", function () {
                return rejects({
                    as_needed: false,
                    regularly: true,
                    until: { type: "forever" },
                    frequency: { n: 1, unit: "day", exclude: {exclude: [1], repeat: null} },
                    times: [{ type: "unspecified" }],
                    take_with_food: null,
                    take_with_medications: [],
                    take_without_medications: []
                });
            });

            it("rejects frequencies with an invalid 'exclude.repeat' key", function () {
                return rejects({
                    as_needed: false,
                    regularly: true,
                    until: { type: "forever" },
                    frequency: { n: 1, unit: "day", exclude: {exclude: [1], repeat: "foo"} },
                    times: [{ type: "unspecified" }],
                    take_with_food: null,
                    take_with_medications: [],
                    take_without_medications: []
                });
            });

            it("rejects frequencies with a negative 'exclude.repeat' key", function () {
                return rejects({
                    as_needed: false,
                    regularly: true,
                    until: { type: "forever" },
                    frequency: { n: 1, unit: "day", exclude: {exclude: [1], repeat: -1} },
                    times: [{ type: "unspecified" }],
                    take_with_food: null,
                    take_with_medications: [],
                    take_without_medications: []
                });
            });

            it("rejects frequencies with a zero 'exclude.repeat' key", function () {
                return rejects({
                    as_needed: false,
                    regularly: true,
                    until: { type: "forever" },
                    frequency: { n: 1, unit: "day", exclude: {exclude: [1], repeat: 0} },
                    times: [{ type: "unspecified" }],
                    take_with_food: null,
                    take_with_medications: [],
                    take_without_medications: []
                });
            });

            it("rejects frequencies with a nonintegral 'exclude.repeat' key", function () {
                return rejects({
                    as_needed: false,
                    regularly: true,
                    until: { type: "forever" },
                    frequency: { n: 1, unit: "day", exclude: {exclude: [1], repeat: 0.5} },
                    times: [{ type: "unspecified" }],
                    take_with_food: null,
                    take_with_medications: [],
                    take_without_medications: []
                });
            });

            it("rejects frequencies with an extra key inside 'exclude'", function () {
                return rejects({
                    as_needed: false,
                    regularly: true,
                    until: { type: "forever" },
                    frequency: { n: 1, unit: "day", exclude: {exclude: [1], repeat: 2, foo: "bar"} },
                    times: [{ type: "unspecified" }],
                    take_with_food: null,
                    take_with_medications: [],
                    take_without_medications: []
                });
            });

            it("allows frequencies with a valid start date", function () {
                return accepts({
                    as_needed: false,
                    regularly: true,
                    until: { type: "forever" },
                    frequency: { n: 1, unit: "day", start: "2015-07-07" },
                    times: [{ type: "unspecified" }],
                    take_with_food: null,
                    take_with_medications: [],
                    take_without_medications: []
                });
            });

            it("allows frequencies with no start date", function () {
                return accepts({
                    as_needed: false,
                    regularly: true,
                    until: { type: "forever" },
                    frequency: { n: 1, unit: "day" },
                    times: [{ type: "unspecified" }],
                    take_with_food: null,
                    take_with_medications: [],
                    take_without_medications: []
                });
            });

            it("allows frequencies with a null start date", function () {
                return accepts({
                    as_needed: false,
                    regularly: true,
                    until: { type: "forever" },
                    frequency: { n: 1, unit: "day", start: null },
                    times: [{ type: "unspecified" }],
                    take_with_food: null,
                    take_with_medications: [],
                    take_without_medications: []
                });
            });

            it("rejects frequencies with an invalid start date", function () {
                return rejects({
                    as_needed: false,
                    regularly: true,
                    until: { type: "forever" },
                    frequency: { n: 1, unit: "day", start: "foo" },
                    times: [{ type: "unspecified" }],
                    take_with_food: null,
                    take_with_medications: [],
                    take_without_medications: []
                });
            });

            it("allows frequencies with a valid array start date", function () {
                return accepts({
                    as_needed: false,
                    regularly: true,
                    until: { type: "forever" },
                    frequency: { n: 1, unit: "day", start: ["2015-01-01", "2015-01-02"] },
                    times: [{ type: "unspecified" }],
                    take_with_food: null,
                    take_with_medications: [],
                    take_without_medications: []
                });
            });

            it("rejects frequencies with an empty array start date", function () {
                return rejects({
                    as_needed: false,
                    regularly: true,
                    until: { type: "forever" },
                    frequency: { n: 1, unit: "day", start: [] },
                    times: [{ type: "unspecified" }],
                    take_with_food: null,
                    take_with_medications: [],
                    take_without_medications: []
                });
            });

            it("rejects frequencies with an array start date with a null in", function () {
                return rejects({
                    as_needed: false,
                    regularly: true,
                    until: { type: "forever" },
                    frequency: { n: 1, unit: "day", start: ["2015-01-01", null] },
                    times: [{ type: "unspecified" }],
                    take_with_food: null,
                    take_with_medications: [],
                    take_without_medications: []
                });
            });

            it("rejects frequencies with an array start date with a invalid date in", function () {
                return rejects({
                    as_needed: false,
                    regularly: true,
                    until: { type: "forever" },
                    frequency: { n: 1, unit: "day", start: ["2015-01-01", "foo"] },
                    times: [{ type: "unspecified" }],
                    take_with_food: null,
                    take_with_medications: [],
                    take_without_medications: []
                });
            });
        });

        describe("'take_with_food' key", function () {
            it("requires it", function () {
                return rejects({
                    as_needed: false,
                    regularly: true,
                    until: { type: "forever" },
                    frequency: { n: 1, unit: "day" },
                    times: [{ type: "unspecified" }],
                    take_with_medications: [],
                    take_without_medications: []
                });
            });

            it("allows a true value", function () {
                return accepts({
                    as_needed: false,
                    regularly: true,
                    until: { type: "forever" },
                    frequency: { n: 1, unit: "day" },
                    times: [{ type: "unspecified" }],
                    take_with_food: true,
                    take_with_medications: [],
                    take_without_medications: []
                });
            });

            it("allows a false value", function () {
                return accepts({
                    as_needed: false,
                    regularly: true,
                    until: { type: "forever" },
                    frequency: { n: 1, unit: "day" },
                    times: [{ type: "unspecified" }],
                    take_with_food: false,
                    take_with_medications: [],
                    take_without_medications: []
                });
            });

            it("allows a null value", function () {
                return accepts({
                    as_needed: false,
                    regularly: true,
                    until: { type: "forever" },
                    frequency: { n: 1, unit: "day" },
                    times: [{ type: "unspecified" }],
                    take_with_food: null,
                    take_with_medications: [],
                    take_without_medications: []
                });
            });

            it("doesn't allow an invalid value", function () {
                return rejects({
                    as_needed: false,
                    regularly: true,
                    until: { type: "forever" },
                    frequency: { n: 1, unit: "day" },
                    times: [{ type: "unspecified" }],
                    take_with_food: "foo",
                    take_with_medications: [],
                    take_without_medications: []
                });
            });
        });

        describe("take_with_medications key", function () {
            it("doesn't require it", function () {
                return accepts({
                    as_needed: false,
                    regularly: true,
                    until: { type: "forever" },
                    frequency: { n: 1, unit: "day" },
                    times: [{ type: "unspecified" }],
                    take_with_food: null,
                    take_without_medications: []
                });
            });

            it("accepts a null value", function () {
                return accepts({
                    as_needed: false,
                    regularly: true,
                    until: { type: "forever" },
                    frequency: { n: 1, unit: "day" },
                    times: [{ type: "unspecified" }],
                    take_with_food: null,
                    take_with_medications: null,
                    take_without_medications: []
                });
            });

            it("rejects an invalid value", function () {
                return rejects({
                    as_needed: false,
                    regularly: true,
                    until: { type: "forever" },
                    frequency: { n: 1, unit: "day" },
                    times: [{ type: "unspecified" }],
                    take_with_food: null,
                    take_with_medications: "foo",
                    take_without_medications: []
                });
            });

            it("accepts an array of positive integers", function () {
                return accepts({
                    as_needed: false,
                    regularly: true,
                    until: { type: "forever" },
                    frequency: { n: 1, unit: "day" },
                    times: [{ type: "unspecified" }],
                    take_with_food: null,
                    take_with_medications: [0, 1],
                    take_without_medications: []
                });
            });

            it("rejects an array containing non-numeric values", function () {
                return rejects({
                    as_needed: false,
                    regularly: true,
                    until: { type: "forever" },
                    frequency: { n: 1, unit: "day" },
                    times: [{ type: "unspecified" }],
                    take_with_food: null,
                    take_with_medications: ["foo", 1],
                    take_without_medications: []
                });
            });

            it("rejects an array containing negative values", function () {
                return rejects({
                    as_needed: false,
                    regularly: true,
                    until: { type: "forever" },
                    frequency: { n: 1, unit: "day" },
                    times: [{ type: "unspecified" }],
                    take_with_food: null,
                    take_with_medications: [-1, 1],
                    take_without_medications: []
                });
            });

            it("rejects an array containing non-integer values", function () {
                return rejects({
                    as_needed: false,
                    regularly: true,
                    until: { type: "forever" },
                    frequency: { n: 1, unit: "day" },
                    times: [{ type: "unspecified" }],
                    take_with_food: null,
                    take_with_medications: [1.5, 1],
                    take_without_medications: []
                });
            });
        });

        describe("take_without_medications key", function () {
            it("doesn't require it", function () {
                return accepts({
                    as_needed: false,
                    regularly: true,
                    until: { type: "forever" },
                    frequency: { n: 1, unit: "day" },
                    times: [{ type: "unspecified" }],
                    take_with_food: null,
                    take_with_medications: []
                });
            });

            it("accepts a null value", function () {
                return accepts({
                    as_needed: false,
                    regularly: true,
                    until: { type: "forever" },
                    frequency: { n: 1, unit: "day" },
                    times: [{ type: "unspecified" }],
                    take_with_food: null,
                    take_without_medications: null,
                    take_with_medications: []
                });
            });

            it("rejects an invalid value", function () {
                return rejects({
                    as_needed: false,
                    regularly: true,
                    until: { type: "forever" },
                    frequency: { n: 1, unit: "day" },
                    times: [{ type: "unspecified" }],
                    take_with_food: null,
                    take_without_medications: "foo",
                    take_with_medications: []
                });
            });

            it("accepts an array of positive integers", function () {
                return accepts({
                    as_needed: false,
                    regularly: true,
                    until: { type: "forever" },
                    frequency: { n: 1, unit: "day" },
                    times: [{ type: "unspecified" }],
                    take_with_food: null,
                    take_without_medications: [0, 1],
                    take_with_medications: []
                });
            });

            it("rejects an array containing non-numeric values", function () {
                return rejects({
                    as_needed: false,
                    regularly: true,
                    until: { type: "forever" },
                    frequency: { n: 1, unit: "day" },
                    times: [{ type: "unspecified" }],
                    take_with_food: null,
                    take_without_medications: ["foo", 1],
                    take_with_medications: []
                });
            });

            it("rejects an array containing negative values", function () {
                return rejects({
                    as_needed: false,
                    regularly: true,
                    until: { type: "forever" },
                    frequency: { n: 1, unit: "day" },
                    times: [{ type: "unspecified" }],
                    take_with_food: null,
                    take_without_medications: [-1, 1],
                    take_with_medications: []
                });
            });

            it("rejects an array containing non-integer values", function () {
                return rejects({
                    as_needed: false,
                    regularly: true,
                    until: { type: "forever" },
                    frequency: { n: 1, unit: "day" },
                    times: [{ type: "unspecified" }],
                    take_with_food: null,
                    take_without_medications: [1.5, 1],
                    take_with_medications: []
                });
            });
        });


        describe("'times' key", function () {
            it("accepts an empty array", function () {
                return accepts({
                    as_needed: false,
                    regularly: true,
                    until: { type: "forever" },
                    frequency: { n: 1, unit: "day" },
                    times: [],
                    take_with_food: null,
                    take_with_medications: [],
                    take_without_medications: []
                });
            });

            it("requires it", function () {
                return rejects({
                    as_needed: false,
                    regularly: true,
                    until: { type: "forever" },
                    frequency: { n: 1, unit: "day" },
                    take_with_food: null,
                    take_with_medications: [],
                    take_without_medications: []
                });
            });

            it("rejects a null value", function () {
                return rejects({
                    as_needed: false,
                    regularly: true,
                    until: { type: "forever" },
                    frequency: { n: 1, unit: "day" },
                    times: null,
                    take_with_food: null,
                    take_with_medications: [],
                    take_without_medications: []
                });
            });

            it("rejects an invalid value", function () {
                return rejects({
                    as_needed: false,
                    regularly: true,
                    until: { type: "forever" },
                    frequency: { n: 1, unit: "day" },
                    times: "foo",
                    take_with_food: null,
                    take_with_medications: [],
                    take_without_medications: []
                });
            });

            it("allows all different type of times", function () {
                return accepts({
                    as_needed: false,
                    regularly: true,
                    until: { type: "forever" },
                    frequency: { n: 1, unit: "day" },
                    times: [
                        { type: "event", event: "breakfast", when: "before" },
                        { type: "event", event: "breakfast", when: "after" },
                        { type: "event", event: "lunch", when: "before" },
                        { type: "event", event: "lunch", when: "after" },
                        { type: "event", event: "dinner", when: "before" },
                        { type: "event", event: "dinner", when: "after" },
                        { type: "event", event: "sleep", when: "before" },
                        { type: "event", event: "sleep", when: "after" },
                        { type: "exact", time: "09:00 am" },
                        { type: "exact", time: "09:30 pm" },
                        { type: "unspecified" }
                    ],
                    take_with_food: null,
                    take_with_medications: [],
                    take_without_medications: []
                });
            });

            it("allows each time to have an ID", function () {
                return accepts({
                    as_needed: false,
                    regularly: true,
                    until: { type: "forever" },
                    frequency: { n: 1, unit: "day" },
                    times: [
                        { id: 1, type: "event", event: "breakfast", when: "before" },
                        { id: 2, type: "event", event: "breakfast", when: "after" },
                        { id: 3, type: "event", event: "lunch", when: "before" },
                        { id: 4, type: "event", event: "lunch", when: "after" },
                        { id: 5, type: "event", event: "dinner", when: "before" },
                        { id: 6, type: "event", event: "dinner", when: "after" },
                        { id: 7, type: "event", event: "sleep", when: "before" },
                        { id: 8, type: "event", event: "sleep", when: "after" },
                        { id: 9, type: "exact", time: "09:00 am" },
                        { id: 10, type: "exact", time: "09:30 pm" },
                        { id: 11, type: "unspecified" }
                    ],
                    take_with_food: null,
                    take_with_medications: [],
                    take_without_medications: []
                });
            });

            it("allows each time to have a notifications key and ignores it", function () {
                return acceptsManual({
                    as_needed: false,
                    regularly: true,
                    until: { type: "forever" },
                    frequency: { n: 1, unit: "day" },
                    times: [
                        { type: "event", event: "breakfast", when: "before", notifications: { default: 5 } },
                        { type: "event", event: "breakfast", when: "after", notifications: { default: 5 } },
                        { type: "event", event: "lunch", when: "before", notifications: { default: 5 } },
                        { type: "event", event: "lunch", when: "after", notifications: { default: 5 } },
                        { type: "event", event: "dinner", when: "before", notifications: { default: 5 } },
                        { type: "event", event: "dinner", when: "after", notifications: { default: 5 } },
                        { type: "event", event: "sleep", when: "before", notifications: { default: 5 } },
                        { type: "event", event: "sleep", when: "after", notifications: { default: 5 } },
                        { type: "exact", time: "09:00 am", notifications: { default: 5 } },
                        { type: "exact", time: "09:30 pm", notifications: { default: 5 } },
                        { type: "unspecified", notifications: { default: 5 } }
                    ],
                    take_with_food: null,
                    take_with_medications: [],
                    take_without_medications: []
                }, {
                    as_needed: false,
                    regularly: true,
                    until: { type: "forever" },
                    frequency: { n: 1, unit: "day" },
                    times: [
                        { type: "event", event: "breakfast", when: "before" },
                        { type: "event", event: "breakfast", when: "after" },
                        { type: "event", event: "lunch", when: "before" },
                        { type: "event", event: "lunch", when: "after" },
                        { type: "event", event: "dinner", when: "before" },
                        { type: "event", event: "dinner", when: "after" },
                        { type: "event", event: "sleep", when: "before" },
                        { type: "event", event: "sleep", when: "after" },
                        { type: "exact", time: "09:00 am" },
                        { type: "exact", time: "09:30 pm" },
                        { type: "unspecified" }
                    ],
                    take_with_food: null,
                    take_with_medications: [],
                    take_without_medications: []
                });
            });

            it("rejects a notifications key that's null", function () {
                return rejects({
                    as_needed: false,
                    regularly: true,
                    until: { type: "forever" },
                    frequency: { n: 1, unit: "day" },
                    times: [
                        { type: "unspecified", notifications: null }
                    ],
                    take_with_food: null,
                    take_with_medications: [],
                    take_without_medications: []
                });
            });

            it("rejects a notifications key that's a string", function () {
                return rejects({
                    as_needed: false,
                    regularly: true,
                    until: { type: "forever" },
                    frequency: { n: 1, unit: "day" },
                    times: [
                        { type: "unspecified", notifications: "foo" }
                    ],
                    take_with_food: null,
                    take_with_medications: [],
                    take_without_medications: []
                });
            });

            it("rejects extra keys in times", function () {
                return rejects({
                    as_needed: false,
                    regularly: true,
                    until: { type: "forever" },
                    frequency: { n: 1, unit: "day" },
                    times: [
                        { type: "unspecified", foo: "bar" }
                    ],
                    take_with_food: null,
                    take_with_medications: [],
                    take_without_medications: []
                });
            });

            it("rejects invalid types", function () {
                return rejects({
                    as_needed: false,
                    regularly: true,
                    until: { type: "forever" },
                    frequency: { n: 1, unit: "day" },
                    times: [{ type: "foo" }],
                    take_with_food: null,
                    take_with_medications: [],
                    take_without_medications: []
                });
            });
            it("requires a type field", function () {
                return rejects({
                    as_needed: false,
                    regularly: true,
                    until: { type: "forever" },
                    frequency: { n: 1, unit: "day" },
                    times: [{ }],
                    take_with_food: null,
                    take_with_medications: [],
                    take_without_medications: []
                });
            });
            it("rejects null types", function () {
                return rejects({
                    as_needed: false,
                    regularly: true,
                    until: { type: "forever" },
                    frequency: { n: 1, unit: "day" },
                    times: [{ type: null }],
                    take_with_food: null,
                    take_with_medications: [],
                    take_without_medications: []
                });
            });

            describe("event", function () {
                it("requires an event field", function () {
                    return rejects({
                        as_needed: false,
                        regularly: true,
                        until: { type: "forever" },
                        frequency: { n: 1, unit: "day" },
                        times: [{ type: "event", when: "before" }],
                        take_with_food: null,
                        take_with_medications: [],
                        take_without_medications: []
                    });
                });

                it("rejects a null event field", function () {
                    return rejects({
                        as_needed: false,
                        regularly: true,
                        until: { type: "forever" },
                        frequency: { n: 1, unit: "day" },
                        times: [{ type: "event", event: null, when: "before" }],
                        take_with_food: null,
                        take_with_medications: [],
                        take_without_medications: []
                    });
                });

                it("rejects an invalid event field", function () {
                    return rejects({
                        as_needed: false,
                        regularly: true,
                        until: { type: "forever" },
                        frequency: { n: 1, unit: "day" },
                        times: [{ type: "event", event: "foo", when: "before" }],
                        take_with_food: null,
                        take_with_medications: [],
                        take_without_medications: []
                    });
                });

                it("requires a when field", function () {
                    return rejects({
                        as_needed: false,
                        regularly: true,
                        until: { type: "forever" },
                        frequency: { n: 1, unit: "day" },
                        times: [{ type: "event", event: "lunch" }],
                        take_with_food: null,
                        take_with_medications: [],
                        take_without_medications: []
                    });
                });

                it("rejects a null when field", function () {
                    return rejects({
                        as_needed: false,
                        regularly: true,
                        until: { type: "forever" },
                        frequency: { n: 1, unit: "day" },
                        times: [{ type: "event", event: "lunch", when: null }],
                        take_with_food: null,
                        take_with_medications: [],
                        take_without_medications: []
                    });
                });

                it("rejects an invalid when field", function () {
                    return rejects({
                        as_needed: false,
                        regularly: true,
                        until: { type: "forever" },
                        frequency: { n: 1, unit: "day" },
                        times: [{ type: "event", event: "lunch", when: "foo" }],
                        take_with_food: null,
                        take_with_medications: [],
                        take_without_medications: []
                    });
                });

                it("rejects a time field", function () {
                    return rejects({
                        as_needed: false,
                        regularly: true,
                        until: { type: "forever" },
                        frequency: { n: 1, unit: "day" },
                        times: [{ type: "event", event: "lunch", when: "before", time: "09:00 am" }],
                        take_with_food: null,
                        take_with_medications: [],
                        take_without_medications: []
                    });
                });
            });
            describe("exact", function () {
                it("requires a time field", function () {
                    return rejects({
                        as_needed: false,
                        regularly: true,
                        until: { type: "forever" },
                        frequency: { n: 1, unit: "day" },
                        times: [{ type: "exact" }],
                        take_with_food: null,
                        take_with_medications: [],
                        take_without_medications: []
                    });
                });
                it("rejects a null time", function () {
                    return rejects({
                        as_needed: false,
                        regularly: true,
                        until: { type: "forever" },
                        frequency: { n: 1, unit: "day" },
                        times: [{ type: "exact", time: null }],
                        take_with_food: null,
                        take_with_medications: [],
                        take_without_medications: []
                    });
                });
                it("rejects non-formatted times", function () {
                    return rejects({
                        as_needed: false,
                        regularly: true,
                        until: { type: "forever" },
                        frequency: { n: 1, unit: "day" },
                        times: [{ type: "exact", time: "foo" }],
                        take_with_food: null,
                        take_with_medications: [],
                        take_without_medications: []
                    });
                });
                it("rejects invalid times", function () {
                    return rejects({
                        as_needed: false,
                        regularly: true,
                        until: { type: "forever" },
                        frequency: { n: 1, unit: "day" },
                        times: [{ type: "exact", time: "99:99" }],
                        take_with_food: null,
                        take_with_medications: [],
                        take_without_medications: []
                    });
                });
                it("rejects if an 'event' field is present", function () {
                    return rejects({
                        as_needed: false,
                        regularly: true,
                        until: { type: "forever" },
                        frequency: { n: 1, unit: "day" },
                        times: [{ type: "exact", time: "10:00 am", event: "breakfast" }],
                        take_with_food: null,
                        take_with_medications: [],
                        take_without_medications: []
                    });
                });
                it("rejects if a 'when' field is present", function () {
                    return rejects({
                        as_needed: false,
                        regularly: true,
                        until: { type: "forever" },
                        frequency: { n: 1, unit: "day" },
                        times: [{ type: "exact", time: "10:00 am", when: "after" }],
                        take_with_food: null,
                        take_with_medications: [],
                        take_without_medications: []
                    });
                });
                it("rejects if an 'event' and a 'when' field is present", function () {
                    return rejects({
                        as_needed: false,
                        regularly: true,
                        until: { type: "forever" },
                        frequency: { n: 1, unit: "day" },
                        times: [{ type: "exact", time: "10:00 am", event: "breakfast", when: "after" }],
                        take_with_food: null,
                        take_with_medications: [],
                        take_without_medications: []
                    });
                });
            });
        });
    });
});

