"use strict";
var moment          = require("moment-timezone"),
    ScheduleMatcher = require("../helpers/schedule_matcher.js");

module.exports = function (Schedule) {
    // generate the actual times of the day each scheduled event occurs at
    Schedule.prototype.prepareForMatching = function (habits) {
        // find timezone, using a sensible default
        var tz = "Etc/UTC";
        if (typeof habits !== "undefined" && habits !== null && typeof habits.tz === "string") tz = habits.tz;

        var times;
        if (typeof this.times !== "undefined" && this.times !== null) {
            times = this.times.map(function (item) {
                // calculate times for events
                var eventTime;
                if (item.type === "event") {
                    // calculate when event takes place
                    eventTime = moment(habits[item.event], "hh:mm a");
                    // arbitrary small delta here because the delta itself is less relevant
                    // than distinguishing between before/after and do nothing for during
                    if (item.when === "before") eventTime.subtract(15, "minutes");
                    else if (item.when === "during") eventTime.subtract(0, "minutes");
                    else eventTime.add(15, "minutes");

                    item.time = eventTime.format("hh:mm a");
                } else if (item.type === "exact") {
                    // calculate when event takes place, converting to local time from UTC
                    eventTime = moment.utc(item.time, "hh:mm a").tz(tz);
                    // format as local time
                    item.time = eventTime.format("hh:mm a");
                }

                return item;
            });
        } else {
            times = [];
        }

        return {
            as_needed: this.asNeeded,
            regularly: this.regularly,
            times: times
        };
    };

    // match up to dose events (using ScheduleMatcher which in turn is just a simple wrapper
    // around schedule_matcher.py)
    Schedule.prototype.match = function (doses, habits, callback) {
        var sm = new ScheduleMatcher();
        sm.match(this.prepareForMatching(habits), doses, habits, callback);
    };
};
