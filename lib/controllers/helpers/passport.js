"use strict";

const passport = require("passport");
const config = require("../../../config");
const JwtStrategy = require("passport-jwt").Strategy;
const ExtractJwt = require("passport-jwt").ExtractJwt;
const FacebookStrategy = require("passport-facebook");
const mongoose = require("mongoose");

var User = mongoose.model("User");

const jwtOptions = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: config.jwtSecret,
  passReqToCallback: true
};

const transformFacebookProfile = (profile) => {
    const { id, last_name: lastName, first_name: firstName } = profile;
    return { id, lastName, firstName };
};

module.exports = function() {
    const jwtLogin = new JwtStrategy(jwtOptions, function(req, payload, done) {
      req.authClaims = payload;

      User.findOne({ email: payload.email }, function(err, user) {
        if (err) { return done(err, false); }

        if (user) {
          req.user = user;
          done(null, user);
        } else {
          // **** SPECIAL CASE ****
          // The first admin to exist only exists on the auth service, but will need a
          // user on orange as well. So if the user is "admin" and doesn't have a user
          // in mongo, we create one for them.
          if (payload.scopes.includes("admin")) {
            User.create({
              email: payload.email,
              firstName: "System",
              lastName: "Administrator",
              role: "admin"
            }).then((user) => {
              req.user = user;
              done(null, user);
            }).catch((err) => done(err, false));
          } else {
            done(null, false);
          }
        }
      });
    });
    passport.use(jwtLogin);
    passport.use(new FacebookStrategy(config.facebook, function (accessToken, refreshToken, profile, done) {
        done(null, transformFacebookProfile(profile._json));
    }));

    return {
        initialize: function() {
            return passport.initialize();
        },
        authenticate: passport.authenticate("jwt", { session: false })
      };
};
