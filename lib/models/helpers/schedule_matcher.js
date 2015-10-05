"use strict";
var _ = require("lodash");
var moment = require("moment-timezone");

// helper class to talk to schedule_matcher.py and use it to match up scheduled
// events and dosed events
var ScheduleMatcher = module.exports = function (params) {
    // parameters to send straight to ScheduleMatcher (see documentation in schedule_matcher.py)
    // deprecated
    this.params = params;
    if (typeof this.params === "undefined" || this.params === null) this.params = {};
};

ScheduleMatcher.prototype.match = function (medication, doses, habits, callback) {
    // console.log("CALLED WITH %d doses", doses.length);

    // Setup =================================================================

    // set defaults for habits
    if (!_.has(habits, "wake") || habits.wake === null) {
        habits.wake = "09:00 am";
    }
    if (!_.has(habits, "tz") || habits.tz === null) {
        habits.tz = "America/New_York";
    }
    this.habits = habits;
    var tz = habits.tz;

    // parse ISO 8601-formatted dates into Date objects, and sort them
    function parseDose(dose) {
        var newDose = JSON.parse(JSON.stringify(dose));  // copy the object
        var formatted = moment(dose.date).format();
        var newTz = moment.tz(formatted, tz).format();
        newDose.date = newTz;
        return newDose;
    }
    function sortByDate(dose) {
        return moment.tz(dose.date, tz).unix();
    }
    this.doses = _.map(doses, parseDose);
    this.doses = _.sortBy(this.doses, sortByDate);

    // store time separately for quick access in cost function
    this.doseTimes = _.map(this.doses, sortByDate);

    // calculate start of first day
    // console.log("SETTING firstWake");
    var ampm = this.habits.wake.split(" ")[1];
    var wake = _.map(this.habits.wake.split(" ")[0].split(":"), Number);

    if (wake[0] === 12) wake[0] = 0;
    if (ampm === "pm") {
        wake[0] = wake[0] + 12;
    }

    // console.log("wake %s", wake);

    var firstWake;
    if (this.doseTimes.length > 0) {
        firstWake = (moment.tz(this.doseTimes[0] * 1000, tz)
            .hour(wake[0]).minute(wake[1]).second(0).millisecond(0)).format();
        if (moment.tz(firstWake, tz).isAfter(moment(this.doseTimes[0] * 1000))) {
            firstWake = (moment.tz(firstWake, tz).subtract(1, "days")).format();
        }
    } else {
        // sensible default (TODO: I don"t think this is sensible *JSS; what about timezone?)
        firstWake = moment().tz(tz).format();
    }
    // console.log(moment(firstWake).format());
    // console.log();

    // helper function for indexing days
    function dayIndex(dose) {
        // calculate start of that day
        var startDay = moment.tz(dose.date, tz).hour(wake[0]).minute(wake[1]).second(0).millisecond(0);
        if (startDay.isAfter(moment.tz(dose.date, tz))) {
            startDay = startDay.subtract(1, "days");
        }
        return startDay.diff(firstWake, "days");
    }

    // Matching ==============================================================

    // match objects to be returned
    var matches = [];

    // transpose of matrix corresponding to the above,
    // used to determine what to do with unmatched dose events
    var reverse_matches = {};

    _.forEach(this.doses, function (dose) {
        var match = {
            "match": {}
        };

        // console.log("MATCHING UP DOSE");
        // console.log(dose);

        // extract day of dose
        var day = dayIndex(dose);
        match.match.day = day;
        if (!_.has(reverse_matches, day)) {
            reverse_matches[day] = {};
        }
        // console.log("Day %d", day);

        // store ID of dose
        match.dose = dose._id;
        match.doseF = dose;

        // use scheduled attribute if present (contains ID of index we should match to)
        if (_.has(dose, "scheduled") && dose.scheduled !== null) {
            // just in case the event matched is unspecified, record it so we don"t duplicate it
            reverse_matches[day][dose.scheduled] = true;
            match.match.index = dose.scheduled;
        }

        // otherwise loop through and match up
        matches.push(match);

        // console.log();
    });

    // console.log("INITIAL MATCHES");
    // console.log(matches);
    // console.log();

    _.forEach(matches, function (match, i) {
        var day = match.match.day;

        // skip the match if we"ve already matched it
        if (_.has(match.match, "index")) {
            delete match.doseF;
            matches[i] = match;
            return;
        }

        // otherwise check if there"s still a free "unspecified" schedule event that day to match to
        var unspecified = [];
        var schedule = medication.scheduleFor(match.doseF).prepareForMatching(habits);
        _.forEach(schedule.times, function (event) {
            if (event.type === "unspecified") {
                unspecified.push(event._id);
            }
        });
        unspecified.every(function (event) {
            var event_used = (_.has(reverse_matches[day], event)) && (reverse_matches[day][event] === true);
            if (!event_used) {
                reverse_matches[day][event] = true;
                match.match.index = event;
                return false;
            }
        });

        // if we still haven"t found anything, use null to denote no match was found
        // i.e. it was probably a PRN medication
        if (!_.has(match.match, "index")) {
            match.match = null;
        }

        delete match.doseF;
        matches[i] = match;
    });

    // console.log("FINAL MATCHES");
    // console.log(matches);
    // console.log();

    var ret = {
        "matches": matches,
        "start": moment.tz(firstWake, tz).format()
    };
    callback(null, ret);
};
