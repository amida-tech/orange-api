"use strict";

module.exports = function (PatientSchema) {
    // virtual getter and setter for a 'habits' key handles getting/setting the
    // individual mongo fields for us
    PatientSchema.virtual("habits").get(function () {
        return {
            wake: this.wake,
            sleep: this.sleep,
            breakfast: this.breakfast,
            lunch: this.lunch,
            dinner: this.dinner
        };
    }).set(function (habits) {
        // Upate the habits of a patient from an object containing them, ignoring any undefined
        // values but storing any blank values
        if (typeof habits.wake !== "undefined") this.wake = habits.wake;
        if (typeof habits.sleep !== "undefined") this.sleep = habits.sleep;
        if (typeof habits.breakfast !== "undefined") this.breakfast = habits.breakfast;
        if (typeof habits.lunch !== "undefined") this.lunch = habits.lunch;
        if (typeof habits.dinner !== "undefined") this.dinner = habits.dinner;
    });

    // update and save habits
    PatientSchema.methods.updateHabits = function (habits, callback) {
        this.habits = habits;
        this.save(callback);
    };
};
