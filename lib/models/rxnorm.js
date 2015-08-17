"use strict";
var mongoose    = require("mongoose"),
    rxnorm      = require("rxnorm-js"),
    errors      = require("../errors.js").ERRORS;

// Mongoose model used for caching RXNorm responses (their API limits us to 20
// queries a second)
// Mongo is fast enough here, and using Redis would add unnecessary overhead to deployment

/*eslint-disable key-spacing */
var RXNormSchema = mongoose.Schema({
    type:       { type: String, required: true }, // method name
    medname:    { type: String }, // query - not required as may be blank
    response:   { type: mongoose.Schema.Types.Mixed, required: true } // JSON
});
/*eslint-enable key-spacing */
RXNormSchema.index({ type: 1, medname: 1 }, { unique: true }); // compound index

// wrappers around each method that use the above model to cache
RXNormSchema.statics.queryRxNormGroup = function (medname, callback) {
    var collection = this;

    collection.findOne({
        type: "queryRxNormGroup",
        medname: medname
    }, function (err, result) {
        if (err) return callback(err);

        // cached response found
        if (typeof result !== "undefined" && result !== null) return callback(null, result.response);

        // no cached response found
        rxnorm.queryRxNormGroup(medname, function (err, response) {
            // catch errors communicating with the API
            if (err) return callback(errors.RXNORM_ERROR);

            // cache response
            collection.create({
                type: "queryRxNormGroup",
                medname: medname,
                response: response
            }, function (err) {
                if (err) return callback(err);

                return callback(null, response);
            });
        });
    });
};

RXNormSchema.statics.queryRxNormSpelling = function (medname, callback) {
    var collection = this;

    collection.findOne({
        type: "queryRxNormSpelling",
        medname: medname
    }, function (err, result) {
        if (err) return callback(err);

        // cached response found
        if (typeof result !== "undefined" && result !== null) return callback(null, result.response);

        // no cached response found
        rxnorm.queryRxNormSpelling(medname, function (err, response) {
            // catch errors communicating with the API
            if (err) return callback(errors.RXNORM_ERROR);

            // cache response
            collection.create({
                type: "queryRxNormSpelling",
                medname: medname,
                response: response
            }, function (err) {
                if (err) return callback(err);

                return callback(null, response);
            });
        });
    });
};

module.exports = mongoose.model("RXNorm", RXNormSchema);
