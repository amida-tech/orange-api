"use strict";
var mongoose = require("mongoose");

// Based on mongoose-auto-increment but with auto increment support
var CounterSchema = mongoose.Schema({
    slug:  { type: String, require: true },
    count: { type: Number, default: 0 }
});
CounterSchema.index({ slug: 1 }, { unique: true, required: true, index: -1 });

// find or create counter, and return count
CounterSchema.statics.nextInSeq = function (slug, callback) {
    // yet another feature mongoose doesn't support natively
    this.collection.findAndModify({ slug: slug }, [], { $inc: { count: 1 } }, {
        new: true,   // return new doc if one is upserted
        upsert: true // insert the document if it does not exist
    }, function (err, counter) {
        if (err) return callback(err);
        callback(null, counter.value.count);
    });
};

var Counter = module.exports = mongoose.model('Counter', CounterSchema);
