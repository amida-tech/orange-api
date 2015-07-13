"use strict";

var doubleMetaphone = require("double-metaphone");

// metaphone (better soundex) fuzzy matching on fields
// simply add something like
//      DoctorSchema.plugin(fuzzy, { fields: ["name"] });
// to your schema
module.exports = function autoIncrementId (schema, options) {
    // calculate metaphone array from a piece of text
    var metaphone = schema.statics.metaphone = function (text) {
        if (typeof text === "undefined" || text === null) return [];

        // split on non-alpha characters to rudimentarily tokenize into words
        var words = text.split(/[^A-Za-z]/).filter(function (word) {
            return word.length > 0;
        });
        return words.map(function (word) {
            // combine doubleMetaphone together for higher accuracy
            return doubleMetaphone(word).join(";");
        }).filter(function (value) {
            // ; always present
            return value.length > 1;
        });
    };

    // add e.g., _s_name schema fields
    var schemaAdditions = {};
    options.fields.forEach(function (field) {
        var metaphoneField = "_s_" + field;
        // metaphone value of field, one value per word in name
        schemaAdditions[metaphoneField] = [{ type: String }];

        // calculate and store in pre save hook
        schema.pre("save", function (next) {
            this[metaphoneField] = metaphone(this[field]);
            next();
        });
    });
    schema.add(schemaAdditions);
};
