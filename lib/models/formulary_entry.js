"use strict";
var mongoose = require("mongoose");
var async = require("async");
var regexEscape = require("./helpers/regex_escape.js").regexEscape;

var FormularyEntrySchema = new mongoose.Schema({
    vaClass: { type: String, required: true },
    genericName: { type: String, required: true },
    dosageForm: { type: String, default: "" },
    restriction: { type: String, default: "" },
    comments: { type: String, default: "" }
});

FormularyEntrySchema.statics.findByParameters = function (query, parameters, done) {
    // build up the mongo query to execute
    // perform fuzzy matching by comparing double metaphone (better soundex) values
    var vaClass = parameters.vaClass, genericName = parameters.genericName;
    if (typeof genericName !== "undefined" && genericName !== null && genericName.length !== 0) {
        query.genericName = new RegExp(regexEscape(genericName), "i");
    }
    if (typeof vaClass !== "undefined" && vaClass !== null && vaClass.length !== 0) {
        query.vaClass = vaClass;
    }

    // find users
    var find = function (callback) {
        // basic query
        var q = this.find(query);

        if (typeof parameters.sortBy === "undefined") {
            parameters.sortBy = "id";
        }
        if (typeof parameters.sortOrder === "undefined") {
            parameters.sortOrder = "asc";
        }
        // if we should sort users, do so
        if (typeof parameters.sortBy !== "undefined" && typeof parameters.sortOrder !== "undefined") {
            // sort patients by the specified field in the specified order
            var sort = {};
            if (parameters.sortBy === "id") parameters.sortBy = "_id";
            sort[parameters.sortBy] = parameters.sortOrder;

            q = q.sort(sort);
        }

        // if we should paginate, do so
        if (typeof parameters.offset !== "undefined") q = q.skip(parameters.offset);
        if (typeof parameters.limit !== "undefined") q = q.limit(parameters.limit);

        q.exec(callback);
    }.bind(this);

    // count patients
    var count = function (callback) {
        this.countDocuments(query, callback);
    }.bind(this);

    return async.parallel({ data: find, count: count }, function (err, results) {
        if (err) return done(err);
        done(results.find, results.data, results.count);
    });
};

module.exports = mongoose.model("FormularyEntry", FormularyEntrySchema);
