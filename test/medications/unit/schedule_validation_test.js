"use strict";
var chai            = require("chai"),
    ScheduleParser  = require("../../../lib/models/helpers/schedule_parser.js");
var expect = chai.expect;

var parseSchedule = function (schedule) {
    var parser = new ScheduleParser();
    return parser.parse(schedule);
};

// from http://jamesroberts.name to convert camelcase to snoke case
function toSnakeCase (str) {
    return str.replace(/([A-Z])/g, function ($1) { return "_" + $1.toLowerCase(); });
}

describe("Medications", function () {
    describe("validates schedules correctly", function () {
        // checks validation, and further check it's parsed into
        // the same object as passed modulo camelcase/snakecase
        var accepts = function (data) {
            // convert camelcase keys back to snakecase
            var parsed = parseSchedule(data);
            var output = {};
            for (var key in parsed) {
                output[toSnakeCase(key)] = parsed[key];
            }
            expect(output).to.deep.equal(data);
        };
        // rather than trying to guess what the output should be,
        // explicitly set it
        var acceptsManual = function (data, output) {
            expect(parseSchedule(data)).to.deep.equal(output);
        };
        var rejects = function (data) {
            expect(parseSchedule(data)).to.be.false;
        };

        it("allows a null schedule and parses it into an empty object", function () {
            return acceptsManual(null, {});
        });

        it("rejects empty schedules", function () {
            return rejects({});
        });

        it("rejects invalid types", function () {
            return rejects({type: "foobar"});
        });

        it("should ignore extra fields", function () {
            return acceptsManual({
                type: "as_needed",
                foo: "bar",
                baz: 7.52
            }, {
                type: "as_needed"
            });
        });

        describe("with as needed schedule", function () {
            it("should accept a basic schedule", function () {
                return accepts({
                    type: "as_needed"
                });
            });

            it("should accept a not_to_exceed integer", function () {
                return accepts({
                    type: "as_needed",
                    not_to_exceed: 3
                });
            });

            it("should reject a zero not_to_exceed", function () {
                return rejects({
                    type: "as_needed",
                    not_to_exceed: 0
                });
            });

            it("should reject a not_to_exceed negative integer", function () {
                return rejects({
                    type: "as_needed",
                    not_to_exceed: -1
                });
            });

            it("should reject a not_to_exceed value that's not an integer", function () {
                return rejects({
                    type: "as_needed",
                    not_to_exceed: 5.75
                });
            });

            it("should reject a not_to_exceed value that's not a number", function () {
                return rejects({
                    type: "as_needed",
                    not_to_exceed: "foo"
                });
            });

            it("should accept a stop date", function () {
                return accepts({
                    type: "as_needed",
                    stop_date: "2015-01-01"
                });
            });

            it("should accept a stop date in conjunction with a not_to_exceed", function () {
                return accepts({
                    type: "as_needed",
                    not_to_exceed: 3,
                    stop_date: "2015-01-01"
                });
            });

            it("should not accept nonexistent dates", function () {
                return rejects({
                    type: "as_needed",
                    stop_date: "2015-15-01"
                });
            });

            it("should not accept invalid dates", function () {
                return rejects({
                    type: "as_needed",
                    stop_date: "foo"
                });
            });

            it("should not accept invalid dates in conjunction with a not_to_exceed", function () {
                return rejects({
                    type: "as_needed",
                    not_to_exceed: 3,
                    stop_date: "foo"
                });
            });
        });

        describe("regular schedule", function () {
            it("should not accept a schedule with no frequency specified", function () {
                return rejects({
                    type: "regularly",
                    number_of_times: 1
                });
            });

            it("should not accept a negative frequency", function () {
                return rejects({
                    type: "regularly",
                    frequency: -1,
                    number_of_times: 1
                });
            });

            it("should not accept a zero frequency", function () {
                return rejects({
                    type: "regularly",
                    frequency: 0,
                    number_of_times: 1
                });
            });

            it("should not accept a non-integer frequency", function () {
                return rejects({
                    type: "regularly",
                    frequency: 1.2,
                    number_of_times: 1
                });
            });

            it("should not accept a non-numeric frequency", function () {
                return rejects({
                    type: "regularly",
                    frequency: "foo",
                    number_of_times: 1
                });
            });

            describe("with valid frequency", function () {
                it("should not accept a schedule with no time of day key", function () {
                    return rejects({
                        type: "regularly",
                        frequency: 3
                    });
                });
            });

            describe("with number_of_times", function () {
                it("should accept a natural-number number_of_times", function () {
                    return accepts({
                        type: "regularly",
                        frequency: 3,
                        number_of_times: 2
                    });
                });

                it("should not accept a negative number_of_times", function () {
                    return rejects({
                        type: "regularly",
                        frequency: 3,
                        number_of_times: -1
                    });
                });

                it("should not accept a zero number_of_times", function () {
                    return rejects({
                        type: "regularly",
                        frequency: 3,
                        number_of_times: 0
                    });
                });

                it("should not accept a non-numeric number_of_times", function () {
                    return rejects({
                        type: "regularly",
                        frequency: 3,
                        number_of_times: "foo"
                    });
                });

                it("should accept a stop date", function () {
                    return accepts({
                        type: "regularly",
                        frequency: 3,
                        number_of_times: 3,
                        stop_date: "2015-05-01"
                    });
                });

                it("should not accept nonexistent dates", function () {
                    return rejects({
                        type: "regularly",
                        frequency: 3,
                        number_of_times: 3,
                        stop_date: "2015-15-01"
                    });
                });

                it("should not accept invalid dates", function () {
                    return rejects({
                        type: "regularly",
                        frequency: 3,
                        number_of_times: 3,
                        stop_date: "foo"
                    });
                });
            });

            describe("with times_of_day", function () {
                it("should not accept both times_of_day and number_of_times when lengths match", function () {
                    return rejects({
                        type: "regularly",
                        frequency: 3,
                        number_of_times: 2,
                        times_of_day: ["15:00", "18:00"]
                    });
                });

                it("should not accept both times_of_day and number_of_times when lengths don't match", function () {
                    return rejects({
                        type: "regularly",
                        frequency: 3,
                        number_of_times: 3,
                        times_of_day: ["15:00", "18:00"]
                    });
                });

                it("should not accept an empty array", function () {
                    return rejects({
                        type: "regularly",
                        frequency: 3,
                        times_of_day: []
                    });
                });

                it("should accept valid times", function () {
                    return accepts({
                        type: "regularly",
                        frequency: 3,
                        times_of_day: ["15:00", "18:00"]
                    });
                });

                it("should accept valid slugs", function () {
                    return accepts({
                        type: "regularly",
                        frequency: 3,
                        times_of_day: ["before_sleep", "after_sleep", "before_breakfast", "after_breakfast",
                            "before_lunch", "after_lunch", "before_dinner", "after_dinner"]
                    });
                });

                it("should accept valid combinations of the two", function () {
                    return accepts({
                        type: "regularly",
                        frequency: 3,
                        times_of_day: ["before_sleep", "15:00", "after_dinner"]
                    });
                });

                it("should not accept any invalid values", function () {
                    return rejects({
                        type: "regularly",
                        frequency: 3,
                        times_of_day: [-5, "15:00"]
                    });
                });

                it("should not accept any other slugs", function () {
                    return rejects({
                        type: "regularly",
                        frequency: 3,
                        times_of_day: ["before_foo", "15:00"]
                    });
                });

                it("should accept a stop date", function () {
                    return accepts({
                        type: "regularly",
                        frequency: 3,
                        times_of_day: ["before_sleep", "15:00", "after_dinner"],
                        stop_date: "2015-05-01"
                    });
                });

                it("should not accept nonexistent dates", function () {
                    return rejects({
                        type: "regularly",
                        frequency: 3,
                        times_of_day: ["before_sleep", "15:00", "after_dinner"],
                        stop_date: "2015-15-01"
                    });
                });

                it("should not accept invalid dates", function () {
                    return rejects({
                        type: "regularly",
                        frequency: 3,
                        times_of_day: ["before_sleep", "15:00", "after_dinner"],
                        stop_date: "foo"
                    });
                });
            });

            describe("with interval", function () {
                it("should not accept both times_of_day and interval", function () {
                    return rejects({
                        type: "regularly",
                        frequency: 3,
                        times_of_day: ["15:00"],
                        interval: 360
                    });
                });

                it("should not accept both number_of_times and interval", function () {
                    return rejects({
                        type: "regularly",
                        frequency: 3,
                        number_of_times: 4,
                        interval: 360
                    });
                });

                it("should not accept all three types", function () {
                    return rejects({
                        type: "regularly",
                        frequency: 3,
                        times_of_day: ["02:00", "08:00", "14:00", "20:00"],
                        number_of_times: 4,
                        interval: 360
                    });
                });

                it("should accept a natural-number interval", function () {
                    return accepts({
                        type: "regularly",
                        frequency: 1,
                        interval: 360
                    });
                });

                it("should not accept a negative interval", function () {
                    return rejects({
                        type: "regularly",
                        frequency: 1,
                        interval: -360
                    });
                });

                it("should not accept a zero interval", function () {
                    return rejects({
                        type: "regularly",
                        frequency: 1,
                        interval: 0
                    });
                });

                it("should not accept a non-integer interval", function () {
                    return rejects({
                        type: "regularly",
                        frequency: 1,
                        interval: 4.5
                    });
                });

                it("should not accept a nonnumeric interval", function () {
                    return rejects({
                        type: "regularly",
                        frequency: 1,
                        interval: "foo"
                    });
                });

                it("should accept a stop date", function () {
                    return accepts({
                        type: "regularly",
                        frequency: 3,
                        interval: 360,
                        stop_date: "2015-05-01"
                    });
                });

                it("should not accept nonexistent dates", function () {
                    return rejects({
                        type: "regularly",
                        frequency: 3,
                        interval: 360,
                        stop_date: "2015-15-01"
                    });
                });

                it("should not accept invalid dates", function () {
                    return rejects({
                        type: "regularly",
                        frequency: 3,
                        interval: 360,
                        stop_date: "foo"
                    });
                });
            });
        });
    });
});
