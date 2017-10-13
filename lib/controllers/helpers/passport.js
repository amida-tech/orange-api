"use strict";
const passport = require("passport");
const mongoose = require("mongoose");
const config = require("../../../config");
const JwtStrategy = require("passport-jwt").Strategy;
const ExtractJwt = require("passport-jwt").ExtractJwt;

const User = require("../../models/user/user");

const jwtOptions = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: config.jwtSecret,
  passReqToCallback: true
};

module.exports = function() {
    const jwtLogin = new JwtStrategy(jwtOptions, function(req, payload, done) {
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
        authenticate: passport.authenticate("jwt", { session: false })
      };
};
