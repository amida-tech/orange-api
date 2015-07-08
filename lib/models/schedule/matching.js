"use strict";
var moment          = require("moment-timezone"),
    ScheduleMatcher = require("../helpers/schedule_matcher.js");

module.exports = function (Schedule) {
    // generate the actual times of the day each scheduled event occurs at
    Schedule.prototype.prepareForMatching = function (habits) {
        var times = this.times.map(function (item) {
            // calculate times for events
            if (item.type === "event") {
                // calculate when event takes place
                var eventTime = moment(habits[item.event], "HH:mm");
                // arbitrary small delta here because the delta itself is less relevant
                // than distinguishing between before/after
                if (item.when === "before") eventTime.subtract(15, "minutes");
                else eventTime.add(15, "minutes");
                item.time = eventTime.format("HH:mm");
            } else if (item.type === "exact") {
                // calculate when event takes place, converting to local time from UTC
                var eventTime = moment.utc(habits[item.event], "HH:mm").tz(tz);
                event.time = time.format("HH:mm");
            }

            return item;
        });

        return {
            as_needed: this.asNeeded,
            regularly: this.regularly,
            times: times
        };
    };

    // match up to dose events (using ScheduleMatcher which in turn is just a simple wrapper
    // around schedule_matcher.py)
    Schedule.prototype.match = function (doses, client, habits, callback) {
        var sm = new ScheduleMatcher(client);
        sm.match(this.prepareForMatching(habits), doses, habits, callback);
    };
};
