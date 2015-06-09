var mongoose = require("mongoose");

module.exports = function autoIncrementId (schema, options) {
    schema.add({ _id: {type: Number, required: true }})

    schema.methods.getId = function (callback) {
        mongoose.model("Counter").nextInSeq(options.slug, function (err, counter) {
            if (err) return callback(err);
            this._id = counter;
            callback(null, this);
        }.bind(this));
    };

    schema.pre('validate', function (next, done) {
        // get next sequential ID if no ID is present
        if (typeof this._id === "undefined" || this._id === null) return this.getId(next);
        next();
    });
};
