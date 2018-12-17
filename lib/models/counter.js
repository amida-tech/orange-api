"use strict";
var mongoose = require("mongoose");

// Counter model used for auto incrementing IDs in other models

// Based on mongoose-auto-increment but with support for subdocuments
/*eslint-disable key-spacing */
var CounterSchema = mongoose.Schema({
    slug:  { type: String, require: true },
    count: { type: Number, default: 0 }
});
/*eslint-enable key-spacing */
CounterSchema.index({ slug: 1 }, { unique: true });

// find or create counter, and return count
CounterSchema.statics.nextInSeq = function (slug, callback) {
    this.findOneAndUpdate({ slug: slug }, { $inc: { count: 1 } }, {
        new: true, // return new doc if one is upserted
        upsert: true // insert the document if it does not exist
    }, function (err, counter) {
        if (err) {
            return callback(err);
        }
        callback(null, counter.count);
    });
};

// see helpers/increment_plugin.js for a mongoose plugin to add to models

module.exports = mongoose.model("Counter", CounterSchema);
