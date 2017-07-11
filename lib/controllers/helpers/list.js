"use strict";
var query       = require("../helpers/query.js"),
    moment      = require("moment-timezone"),
    errors      = require("../../errors.js").ERRORS;


// parse parameters used to query a list endpoint
//  - limit
//  - offset
//  - sort_by (based on allowed values passed in, defaulting to first)
//  - sort_order
//  & fields to filter by (based on keys passed in)
module.exports.parseListParameters = function (sortByKeys, filterFields) {
    return function (req, res, next) {
        // max number of results to return (for pagination)
        var limit = query.parseNatural(req.query.limit, 25);
        if (limit === null) return next(errors.INVALID_LIMIT);

        // number of results to skip initially (for pagination)
        var offset = query.parseNatural(req.query.offset, 0);
        if (offset === null) return next(errors.INVALID_OFFSET);

        // key to sort by
        var sortBy = query.parseString(req.query.sort_by, sortByKeys, sortByKeys[0]);
        if (sortBy === null) return next(errors.INVALID_SORT_BY);

        // order to sort in
        var sortOrder = query.parseString(req.query.sort_order, ["asc", "desc"], "asc");
        if (sortOrder === null) return next(errors.INVALID_SORT_ORDER);

        // fields to filter by
        var filters = {};
        filterFields.forEach(function (key) {
            var value = req.query[key];
            // either null or a valid value
            if (typeof value === "undefined" || value === null || value.length === 0) value = null;
            filters[key] = value;
        });

        // store in request
        req.listParameters = {
            limit: limit,
            offset: offset,
            sortBy: sortBy,
            sortOrder: sortOrder,
            filters: filters
        };

        next();
    };
};

// parse and validate start_date and end_date filters
module.exports.parseDateFilters = function (req, res, next) {
    var tz = req.patient.tz || "America/New_York";

    var startDate = req.listParameters.filters.start_date;
    if (startDate !== null) {
        // validate date
        startDate = moment.tz(startDate, tz).hours(0).minutes(0);
        if (!startDate.isValid()) return next(errors.INVALID_START_DATE);
        // store parsed date
        req.listParameters.filters.start_date = startDate;
    }

    var endDate = req.listParameters.filters.end_date;
    if (endDate !== null) {
        // validate date
        endDate = moment.tz(endDate, tz).hours(0).minutes(0).add(1, "day");
        if (!endDate.isValid()) return next(errors.INVALID_END_DATE);
        // store parsed date
        req.listParameters.filters.end_date = endDate;
    }

    // start date shouldn't be before end date
    if (startDate !== null && endDate !== null && endDate.isBefore(startDate))
        return next(errors.INVALID_END_DATE);

    next();
};
