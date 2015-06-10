"use strict";

var mongoose = require("mongoose");

// auto incrementing numerical IDs
// simply add something like
//      MedicationSchema.plugin(autoIncrementId, { slug: "medicationId" });
// to your schema
module.exports = function autoIncrementId (schema, options) {
    schema.add({ _id: {type: Number, required: true }});

    // get and save the next ID in the sequence
    // needs to be asynchronously because we're using findAndModify in Counter
    schema.methods.getId = function (callback) {
        mongoose.model("Counter").nextInSeq(options.slug, function (err, counter) {
            if (err) return callback(err);
            this._id = counter;
            callback(null, this);
        }.bind(this));
    };

    // called before validate and save
    // needs to be here not on pre save otherwise mongoose will (rightly) complain we don't
    // have the required _id field present
    schema.pre("validate", function (next) {
        // we do this synchronously as other validate callbacks may need ID
        // get next sequential ID if no ID is present
        if (typeof this._id === "undefined" || this._id === null) return this.getId(next);
        next();
    });
};
