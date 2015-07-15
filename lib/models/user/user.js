"use strict";
var mongoose        = require("mongoose"),
    uniqueValidator = require("mongoose-unique-validator"),
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
    tokens:         [String] // access tokens for this user
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
        // name of patient should be user's name, defaulting to "me"
        // (patient names are required whereas user names are not)
        var firstName = this.firstName;
        var lastName = this.lastName;
        if (typeof firstName === "undefined" || firstName === null || firstName.length === 0) firstName = "Me";
        if (typeof lastName === "undefined" || lastName === null) lastName = "";

        // create patient and set user as owner of patient
        mongoose.model("Patient").createForUser({
            first_name: firstName,
            last_name: lastName
        }, this, next);
    } else {
        next();
    }
});

// modularised password hashing/authentication, access token generation/authentication
// and email/sms notifications
require("./passwords.js")(UserSchema);
require("./tokens.js")(UserSchema);
require("./notifications.js")(UserSchema);

module.exports = mongoose.model("User", UserSchema);
