"use strict";
var mongoose        = require("mongoose"),
    async           = require("async"),
    uniqueValidator = require("mongoose-unique-validator"),
    RequestSchema   = require("../request.js"),
    EMAIL_REGEXP    = require("../helpers/email.js");

/*eslint-disable key-spacing */
// represents a user of the app: will have many Patients (containing the actual
// interesting data)
var UserSchema = new mongoose.Schema({
    email: {
        type:       String,
        required:   true,
        index: {
            unique: true
        },
        // basic loose regexp for email address matching
        match:      [EMAIL_REGEXP, "INVALID_EMAIL"]
    },
    password:       { type: String, required: true }, // hashed
    firstName:      { type: String, default: "" },
    lastName:       { type: String, default: "" },
    phone:          { type: String, default: "" },
    loginAttempts:  { type: Number, required: true, default: 0 },
    lockUntil:      { type: Number }, // unix time, set to 1 when not locked
    tokens:         [String], // access tokens for this user
    requested:      [RequestSchema], // requests made *by* this user
    requests:       [RequestSchema] // requesst made *from* this user
});
/*eslint-enable key-spacing */
UserSchema.plugin(uniqueValidator, {
    message: "USER_ALREADY_EXISTS"
}); // Give nicer errors when email uniqueness broken

// index this for fast authentication
UserSchema.index({
    "tokens": 1
});

// store empty names and phones rather than undefined ones
// explicitly do this because User.create (called on register in users controller)
// won't create defaults if passed undefined values
// further, we also do this on null values because null values are used to reset fields
UserSchema.pre("save", function (next) {
    if (typeof this.firstName === "undefined" || this.firstName === null) this.firstName = "";
    if (typeof this.lastName === "undefined" || this.lastName === null) this.lastName = "";
    if (typeof this.phone === "undefined" || this.phone === null) this.phone = "";
    next();
});

// when creating a new user, create a patient for them
UserSchema.pre("save", function (next) {
    if (this.isNew) {
        // first name of patient should be user's name, defaulting to "me"
        // (patient names are required whereas user names are not)
        var firstName = this.firstName;
        var lastName = this.lastName;
        if (typeof firstName === "undefined" || firstName === null || firstName.length === 0) firstName = "Me";

        // create patient and set user as owner of patient
        mongoose.model("Patient").createForUser({
            first_name: firstName,
            last_name: lastName,
            phone: this.phone,
            me: true // patient corresponds to user's own log
        }, this, next);
    } else {
        next();
    }
});

// when creating a new user, send them an email as well
UserSchema.pre("save", function (next) {
    if (this.isNew) {
        this.notify({
            template: "registration"
        });
    }

    // notify is asynchronous but we don't care about waiting for the result
    next();
});


// when deleting a user, remove requests made to/from other users
UserSchema.pre("remove", function (next) {
    var User = mongoose.model("User");
    var me = this;

    // users to search for
    var requests = this.requests.map(function (r) {
        r.search = "requested"; // request key to search for in that user
        return r;
    }).concat(this.requested.map(function (r) {
        r.search = "requests";
        return r;
    }));

    async.each(requests, function (request, callback) {
        var email = request.email;
        // if no email is specified we don't care
        if (typeof email === "undefined" || email === null || email.length === 0)
            return callback();

        // find user with email
        User.findOne({ email: request.email }, function (err, user) {
            if (err) return callback(err);

            // ignore if we have no user
            if (!user) return callback();

            // find and remove request
            var r = user[request.search].filter(function (req) {
                return req.email === me.email;
            })[0];
            if (typeof r !== "undefined" && r !== null) r.remove();

            // save user
            user.save(callback);
        });
    }, next);
});

// when deleting a user, remove any shares of patients to this user, and if there
// are any patients who are shared _only_ with this user, remove them
UserSchema.pre("remove", function (next) {
    var Patient = mongoose.model("Patient");
    var me = this;

    // find patients accessible to this user
    Patient.findForUser({}, this, function (err, patients) {
        if (err) return next(err);

        // iterate over each patient
        async.each(patients, function (patient, callback) {
            // if patient is only shared with us, remove it
            if (patient.shares.length === 1) return patient.remove(callback);

            // otherwise just remove our share and save
            var share = patient.shares.filter(function (s) {
                return s.email === me.email;
            })[0];
            if (typeof share !== "undefined" && share !== null) share.remove();
            patient.save(callback);
        }, next);
    });
});


// modularised password hashing/authentication, access token generation/authentication,
// email/sms notifications, and requests to access other patient's data
require("./passwords.js")(UserSchema);
require("./tokens.js")(UserSchema);
require("./notifications.js")(UserSchema);
require("./requests.js")(UserSchema);

module.exports = mongoose.model("User", UserSchema);
