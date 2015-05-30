"use strict";
var express = require('express');
var app = module.exports = express();

var authenticate = require('./auth.js').authenticate;

app.get('/v1/user/habits', authenticate, function(req, res) {
    var habits = req.user.habits;
    // TODO: Are we trusting the model too much?
    habits.success = true;
    res.send(habits);
});

app.put('/v1/user/habits', authenticate, function(req, res, next) {
    req.user.updateHabits({
        wake: req.body.wake,
        sleep: req.body.sleep,
        breakfast: req.body.breakfast,
        lunch: req.body.lunch,
        dinner: req.body.dinner
    }, function(err) {
        if (err) return next(err);
        
        // on success
        var habits = req.user.habits;
        habits.success = true;
        res.send(habits);
    });
});
