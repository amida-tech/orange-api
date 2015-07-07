"use strict";

// helper class to talk to schedule_matcher.py and use it to match up scheduled
// events and dosed events
// initialise with a zerorpc client
var ScheduleMatcher = module.exports = function (zerorpc, params) {
    this.zerorpc = zerorpc;
    // parameters to send straight to ScheduleMatcher (see documentation in schedule_matcher.py)
    this.params = params;
    if (typeof this.params === "undefined" || this.params === null) this.params = {};
};

// take a Medication schedule and an array of dose times, and send them to schedule_matcher.py
// send them over ZeroMQ using ZeroRPC wrapper (sockets but better)
// may take a non-trivial amonut of time (but still millseconds)
ScheduleMatcher.prototype.match = function (schedule, doses, habits, callback) {
    // zerorpc handles stringification for us
    this.zerorpc.invoke("match", schedule, doses, this.params, habits, function (err, results) {
        if (err) return callback(err);

        // results is an array of match items, with each item taking one of the following two forms:
        //      { dose_index: 7, match: null, dose: '2015-07-05T21:30:00-04:00' }
        //      {
        //          dose_index: 8,
        //          match: {
        //              day: 1,
        //              day_index: 2,
        //              event: [Object]
        //          },
        //          dose: '2015-07-05T22:00:00-04:00'
        //      }
        //      TODO: process results
        callback(null, results);
    });
};
