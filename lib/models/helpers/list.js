"use strict";
var extend          = require("xtend"),
    moment          = require("moment-timezone"),
    intersection    = require("array-intersection");

// default filters
var defaultFilters = function (Model) {
    return {
        name: function (item, value) {
            var keys = Model.metaphone(value);
            // use stored metaphone values for fuzzy matching
            return intersection(item._s_name, keys).length > 0;
        },

        text: function (item, value) {
            var keys = Model.metaphone(value);
            // use stored metaphone values for fuzzy matching
            return intersection(item._s_text, keys).length > 0;
        },

        start_date: function (item, value) {
            // date must be on or after start date
            return !moment(item.date).isBefore(value, 'day');
        },

        end_date: function (item, value) {
            // date must be on or before end date
            return !moment(item.date).isAfter(value, 'day');
        },

        // filter to only show items belonging to a specific medication ID
        medication_id: function (item, medicationId) {
            return item.medicationId === medicationId;
        },

        meditation: function(item, value){
            return item.meditation === value;
        },

        // filter to only show items belonging to all medications specified
        medication_ids: function (item, medicationIds) {
            return medicationIds.every(function (medId) {
                return item.medicationIds.indexOf(medId) >= 0;
            });
        },

        // filter to find items with a certain email address
        // (match based on substrings *not* fuzzily like elsewhere)
        email: function (item, email) {
            return item.email.indexOf(email) >= 0;
        },

        // filter to find items with a status matching exactly
        status: function (item, status) {
            return item.status === status;
        },

        // filter to find clinician notes
        clinician: function (item, clinician) {
            return item.clinician === clinician;
        },
    };
};

// default sorters
var defaultSorters = {
    name: function (itemA, itemB) {
        return itemA.name.localeCompare(itemB.name);
    },

    email: function (itemA, itemB) {
        return itemA.email.localeCompare(itemB.email);
    },

    date: function (itemA, itemB) {
        var dateA = moment.utc(itemA.date);
        var dateB = moment.utc(itemB.date);

        if (dateA.isBefore(dateB)) return -1;
        else if (dateB.isBefore(dateA)) return 1;
        else return 0;
    },

    id: function (itemA, itemB) {
        return itemA.id - itemB.id;
    }
};

// params should be a list of query parameters containing:
//  - filters
//  - limit
//  - offset
//  - sortBy
//  - sortOrder
module.exports.query = function (data, params, Model, newFilters, newSorters, user, patient, done) {
    var filters = extend(defaultFilters(Model), newFilters);
    var sorters = extend(defaultSorters, newSorters);

    // default filter to apply to all day
    if (filters.hasOwnProperty("default")) {
        data = data.filter(function (item) {
            return filters.default(item, user, patient);
        });
    }

    // filter data
    for (var field in params.filters) {
        if (params.filters.hasOwnProperty(field)) {
            // value to filter by
            var value = params.filters[field];

            // only filter if a value was specified
            if (value !== null) {
                /*eslint-disable no-loop-func */
                data = data.filter(function (item) {
                    return filters[field](item, value, user, patient);
                });
                /*eslint-enable no-loop-func */
            }
        }
    }

    // limit and offset list
    var count = data.length;
    if (params.limit === 0) data = data.slice(params.offset);
    else data = data.slice(params.offset, params.limit + params.offset);

    // sort list
    data.sort(sorters[params.sortBy]);
    if (params.sortOrder === "desc") data.reverse();

    done(null, data, count);
};
