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

// take a structured Medication schedule and list of Dose objects, format them as schedule_matcher.py
// requires, and send them to it
ScheduleMatcher.prototype.match = function (schedule, doses, callback) {
    // TODO: for now just pass through: this means match doesn't work as expected and requires
    // arrays of numbers. When schedule format is finalised, implement this!!
    this.call(schedule, doses, callback);
};

// actually match the events by sending them over ZeroMQ using ZeroRPC wrapper (sockets but better)
// make take a non-trivial amonut of time (but still millseconds)
ScheduleMatcher.prototype.call = function (scheduleEvents, doseEvents, callback) {
    // zerorpc handles stringification for us
    this.zerorpc.invoke("match", scheduleEvents, doseEvents, this.params, callback);
};
