"use strict";
const passport = require("passport");
const mongoose = require("mongoose");
const config = require("../../../config");
const JwtStrategy = require("passport-jwt").Strategy;
const ExtractJwt = require("passport-jwt").ExtractJwt;

const User = mongoose.model("User");

// Setup options for JWT Strategy
const jwtOptions = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: config.jwtSecret,
  passReqToCallback: true
};

// Create JWT strategy
const jwtLogin = new JwtStrategy(jwtOptions, function(req, payload, done) {
  // See if the user ID in the payload exists in our database
  // If it does, call "done" with that other
  // otherwise, call done without a user object
  User.findOne({ email: payload.email }, function(err, user) {
    if (err) { return done(err, false); }

    if (user) {
      req.user = user;
      done(null, user);
    } else {
      done(null, false);
    }
  });
});

// Tell passport to use this strategy
passport.use(jwtLogin);
