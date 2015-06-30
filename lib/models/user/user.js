"use strict";
var mongoose        = require("mongoose"),
    uniqueValidator = require("mongoose-unique-validator");

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
        match:      [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, "Invalid email address"]
    },
    password:       { type: String, required: true }, // hashed
    name:           { type: String, default: "" },
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

// store empty names rather than undefined ones
// explicitly do this because User.create (called on register in users controller)
// won't create defaults if passed undefined values
// further, we also do this on null values because null values are used to reset fields
UserSchema.pre("save", function (next) {
    if (typeof this.name === "undefined" || this.name === null) this.name = "";
    next();
});

// modularised password hashing/authentication and access token generation/authentication
require("./passwords.js")(UserSchema);
require("./tokens.js")(UserSchema);

module.exports = mongoose.model("User", UserSchema);
