"use strict";

var moment = require("moment-timezone");

module.exports = function (PatientSchema) {
    // virtual getter and setter for a 'habits' key handles getting/setting the
    // individual mongo fields for us
    PatientSchema.virtual("habits").get(function () {
        return {
            wake: this.wake,
            sleep: this.sleep,
            breakfast: this.breakfast,
            lunch: this.lunch,
            dinner: this.dinner,
            tz: this.tz,
            access_anyone: this.permissions.anyone,
            access_family: this.permissions.family,
            access_prime: this.permissions.prime
        };
    }).set(function (habits) {
        // Upate the habits of a patient from an object containing them, ignoring any undefined
        // values but storing any blank values
        if (typeof habits.wake !== "undefined") this.wake = habits.wake;
        if (typeof habits.sleep !== "undefined") this.sleep = habits.sleep;
        if (typeof habits.breakfast !== "undefined") this.breakfast = habits.breakfast;
        if (typeof habits.lunch !== "undefined") this.lunch = habits.lunch;
        if (typeof habits.dinner !== "undefined") this.dinner = habits.dinner;
        if (typeof habits.tz !== "undefined") this.tz = habits.tz;
        if (typeof habits.access_anyone !== "undefined") this.permissions.anyone = habits.access_anyone;
        if (typeof habits.access_family !== "undefined") this.permissions.family = habits.access_family;
        if (typeof habits.access_prime !== "undefined") this.permissions.prime = habits.access_prime;
    });

    // update and save habits
    PatientSchema.methods.updateHabits = function (habits, callback) {
        this.habits = habits;
        this.save(function (err, patient) {
            if (err) return callback(err);
            callback(null, patient.habits);
        });
    };

    // timezone validation
    PatientSchema.path("tz").validate(function (tz) {
        return moment.tz.zone(tz) !== null;
    }, "INVALID_TZ");
};
