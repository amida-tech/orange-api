"use strict";
var _ = require("lodash");
var moment = require("moment-timezone");

// helper class to talk to schedule_matcher.py and use it to match up scheduled
// events and dosed events
// initialise with a zerorpc client
var ScheduleMatcher = module.exports = function (params) {
    // parameters to send straight to ScheduleMatcher (see documentation in schedule_matcher.py)
    // deprecated
    this.params = params;
    if (typeof this.params === "undefined" || this.params === null) this.params = {};
};

// take a Medication schedule and an array of dose times, and send them to schedule_matcher.py
// send them over ZeroMQ using ZeroRPC wrapper (sockets but better)
// may take a non-trivial amonut of time (but still millseconds)
ScheduleMatcher.prototype.match = function (schedule, doses, habits, callback) {

    // Setup =================================================================

    // set defaults for habits
    if (!_.has(habits, "wake") || habits.wake === null) {
        habits["wake"] = "09:00 am";
    }
    if (!_.has(habits, "tz") || habits.tz === null) {
        habits.tz = "America/New_York";
    }
    this.habits = habits;
    var tz = habits["tz"];
    
    // parse ISO 8601-formatted dates into Date objects, and sort them
    function parseDose(dose) {
        dose["date"] = moment(dose["date"]).tz(tz);
        return dose;
    }
    this.doses = _.map(doses, parseDose);
    this.doses = _.sortBy(this.doses, function (dose) {
        return dose["date"];
    });
    // store time separately for quick access in cost function
    this.doseTimes = _.map(this.doses, function(dose) {
        return dose["date"];
    });
    
    // calculate start of first day
    // TODO: needs handling of am/pm
    var ampm = this.habits["wake"].split(" ")[1];
    var wake = _.map(this.habits["wake"].split(" ")[0].split(":"), parseInt);
    
    if (ampm === "pm") {
        wake[1] = wake[1] + 12;
    }
    
    var firstWake;
    if (this.doseTimes.length > 0) {
        firstWake = moment(this.doseTimes[0]).hour(wake[0]).minute(wake[1]).second(0).millisecond(0);
        if (firstWake.isAfter(moment(this.doseTimes[0]))) {
            firstWake = firstWake.subtract(1, "days");
        }
    } else {
        // sensible default (TODO: I don"t think this is sensible *JSS; what about timezone?)
        firstWake = moment();
    }
    
    // find all the "unspecified" schedule events we have
    var unspecified = [];
    _.forEach(schedule["times"], function (event) {
       if (event["type"] === "unspecified") {
           unspecified.push(event["_id"]);
       } 
    });
    
    // helper function for indexing days
    function dayIndex(dose) {
        // calculate start of that day
        var startDay = moment(dose).hour(wake[0]).minute(wake[1]).second(0).millisecond(0);
        if (startDay.isAfter(moment(dose))) {
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
        
        // extract day of dose
        var day = dayIndex(dose["date"]);
        match["match"]["day"] = day;
        if (!_.has(reverse_matches, day)) {
            reverse_matches[day] = {};
        }
        
        // store ID of dose
        match["dose"] = dose["_id"];
        
        // use scheduled attribute if present (contains ID of index we should match to)
        if (_.has(dose, "scheduled") && dose["scheduled"] !== null) {
            // just in case the event matched is unspecified, record it so we don"t duplicate it
            reverse_matches[day][dose["scheduled"]] = true;
            match["match"]["index"] = dose["scheduled"];
        }
        
        // otherwise loop through and match up
        matches.push(match);
    });
    
    _.forEach(matches, function (match, i) {
         var day = match["match"]["day"];
         
         // skip the match if we"ve already matched it
         if(_.has(match["match"], "index")) {
             return;
         }
         
         // otherwise check if there"s still a free "unspecified" schedule event that day to match to
         unspecified.every(function(event) {
             var event_used = (_.has(reverse_matches[day], event)) && (reverse_matches[day][event] === true);
             if (!event_used) {
                 reverse_matches[day][event] = true;
                 match["match"]["index"] = event;
                 return false;
             }
         });
         
         // if we still haven"t found anything, use null to denote no match was found
         // i.e. it was probably a PRN medication
         if (!_.has(match["match"], "index")) {
             match["match"] = null;
         }
         
         matches[i] = match;
    });
    
    var ret = {
        "matches": matches,
        "start": firstWake.toISOString()
    };
    callback(null, ret);
};
