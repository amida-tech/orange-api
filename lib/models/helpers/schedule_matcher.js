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
ScheduleMatcher.prototype.match = function (schedule, doses, callback) {
    // zerorpc handles stringification for us
    this.zerorpc.invoke("match", schedule, doses, this.params, callback);
};
