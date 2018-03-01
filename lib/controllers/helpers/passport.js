"use strict";

const passport = require("passport");
const config = require("../../../config");
const JwtStrategy = require("passport-jwt").Strategy;
const ExtractJwt = require("passport-jwt").ExtractJwt;
const FacebookStrategy = require("passport-facebook");

const User = require("../../models/user/user");
const errors = require("../../errors.js").ERRORS;

const jwtOptions = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: config.jwtSecret,
  passReqToCallback: true
};

const noop = (req, res, next) => next();

const transformFacebookProfile = (profile) => {
    const { id, last_name: lastName, first_name: firstName } = profile;
    return { id, lastName, firstName };
};

const strategies = {
    facebook() {
        passport.use(new FacebookStrategy(config.facebook, function (accessToken, refreshToken, profile, done) {
            done(null, transformFacebookProfile(profile._json));
        }));
    },
    amida() {
        const jwtLogin = new JwtStrategy(jwtOptions, function(req, payload, done) {
            User.findOne({ email: payload.email }, function(err, user) {
                if (err) {
                    return done(err, false);
                }
                if (user) {
                    req.user = user;
                    return done(null, user);
                }
                return done(null, false);
            });
        });
        passport.use(jwtLogin);
    },
    local() {}
};

const initializations = {
    facebook() {
        return passport.initialize();
    },
    amida() {
        return passport.initialize();
    },
    local() {
        return noop;
    }
};

const authentications = {
    facebook: passport.authenticate(),
    amida: passport.authenticate("jwt", { session: false }),
    local: function authenticate(req, res, next) {
        var auth = req.headers.authorization;

        // don"t authenticate OPTIONS requests for browser compatbility
        if (req.method === "OPTIONS") return next();

        // must be of the form "Bearer xxx" where xxx is a (variable-length)
        // access token
        if (typeof auth === "undefined" || auth.indexOf("Bearer") !== 0) {
            return next(errors.ACCESS_TOKEN_REQUIRED);
        }

        // Remove "Bearer " from start of auth
        var accessToken = auth.slice(7);

        // find user and store in request
         User.authenticateFromAccessToken(accessToken, function (err, user) {
            if (err) return next(err);

            req.user = user;
            // proceed to handle request as normal
            next();
        });
    }
};

module.exports = function() {
    const authType = process.env.NODE_ENV === "test" ? "local" : config.authType || "amida";
    const strategy = strategies[authType];
    if (!strategy) {
        throw new Error(`Unknown auth type "${authType}"`);
    }
    strategy();

    return {
        initialize: initializations[authType],
        authenticate: authentications[authType]
    };
};
