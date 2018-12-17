"use strict";
var async           = require("async");

// implements core CRUD functionality for User: creating, deleting, etc
module.exports = function (UserSchema) {
    function format(user, callback) {
        // set name keys in snakecase
        user.first_name = user.firstName;
        user.last_name = user.lastName;

        // return user with new data added (for chaining)
        callback(null, user);
    }
    UserSchema.statics.findByParameters = function (query, parameters, done) {
        // build up the mongo query to execute
        // perform fuzzy matching by comparing double metaphone (better soundex) values
        var keys, firstName = parameters.firstName, lastName = parameters.lastName;
        if (typeof firstName !== "undefined" && firstName !== null && firstName.length !== 0) {
            // require to be any word in _s_first_name
            keys = this.metaphone(firstName);
            if (keys.length > 0) query._s_firstName = { "$in": keys };
        }
        if (typeof lastName !== "undefined" && lastName !== null && lastName.length !== 0) {
            // require to be any word in _s_last_name
            keys = this.metaphone(lastName);
            if (keys.length > 0) query._s_lastName = { "$in": keys };
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
                else if (parameters.sortBy === "first_name") parameters.sortBy = "firstName";
                else if (parameters.sortBy === "last_name") parameters.sortBy = "lastName";
                sort[parameters.sortBy] = parameters.sortOrder;

                q = q.sort(sort);
            }

            // if we should paginate, do so
            if (typeof parameters.offset !== "undefined") q = q.skip(parameters.offset);
            if (typeof parameters.limit !== "undefined") q = q.limit(parameters.limit);

            q.exec(function (err, users) {
                if (err) return callback(err);

                // apply format to each patient
                async.map(users, format, callback);
            });
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
};
