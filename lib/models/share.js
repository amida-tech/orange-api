"use strict";
var mongoose        = require("mongoose"),
    autoIncrementId = require("./helpers/increment_plugin.js");

/*eslint-disable key-spacing */
// a schema to be nested inside a Patient representing a share between a patient
// and a user (many-to-many)
var ShareSchema = module.exports = new mongoose.Schema({
    _id:        { type: Number, required: true, index: true },
    email:      { type: String, required: true },
    group:      { type: String, enum: ["owner", "prime", "family", "anyone"], required: true },
    access:     { type: String, enum: ["read", "write", "default"], required: true, default: "default" }
});
/*eslint-enable key-spacing */
ShareSchema.plugin(autoIncrementId, { slug: "shareId" }); // auto incrementing IDs

// format a share for output
ShareSchema.methods.format = function (callback) {
    // check if user exists
    mongoose.model("User").findOne({ email: this.email }, function (err, user) {
        if (err) return callback(err);

        // is_user is true iff a user with the specified email already exists
        this.is_user = !!user;
        if (this.is_user) {
          this.first_name = user.firstName;
          this.last_name = user.lastName;
          this.avatar = user.avatar;
        }
        return callback(null, this);
    }.bind(this));
};
