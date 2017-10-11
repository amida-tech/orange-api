"use strict";
const passport = require("passport");
const mongoose = require("mongoose");
const config = require("../../../config");
const JwtStrategy = require("passport-jwt").Strategy;
const ExtractJwt = require("passport-jwt").ExtractJwt;

const User = require("../../models/user/user");

// Setup options for JWT Strategy
const jwtOptions = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: config.jwtSecret,
  passReqToCallback: true
};

module.exports = function() {
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
    passport.use(jwtLogin);
    return {
        initialize: function() {
            return passport.initialize();
        },
        authenticate: function(request, response, next) {
            return passport.authenticate("jwt", { session: false }, function(err, user, info) {
              if (err) {
                return next(err);
              }
              next();
            })(request, response, next);
        }
    };
};
