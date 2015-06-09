"use strict";
// Various different helper functions useful to DRY up code in basic CRUD
// controllers

// not moving all of below into proto class because this way allow us to
// potentially use different keys for different routes, so way more modular

// select keys from object
function filter(obj, keys) {
    var filtered = {};
    for (var key in obj) {
        if (keys.indexOf(key) >= 0) filtered[key] = obj[key];
    }
    return filtered;
}

// safe DRY input
function filterInputGenerator(keys) {
    return function (req, res, next) {
        req.data = filter(req.body, keys);
        next();
    };
}

// safe DRY output
// only for successful output: all errors should already have been escalated
// at this point
function formatObjectGenerator(keys, noid) {
    return function (statusCode) {
        return function (req, res) {
            var output = filter(res.data, keys);
            output.success = true;
            if (typeof noid === 'undefined' || !noid) output.id = res.data._id;
            res.status(statusCode);
            res.send(output);
        };
    };
}

function formatListGenerator(keys, slug) {
    return function (req, res) {
        var data = [];
        for (var i = 0; i < res.data.length; i++) {
            var datum = filter(res.data[i], keys);
            datum.id = res.data[i]._id;
            data.push(datum);
        }
        var resp = {
            count: data.length,
            success: true
        };
        resp[slug] = data;
        res.send(resp);
    };
}

// DRY up callbacks to use filterObjectX in most basic way
function returnData(res, next) {
    return function (err, obj) {
        if (err) return next(err);
        res.data = obj;
        next();
    };
}

module.exports = {
    filterInputGenerator: filterInputGenerator,
    formatObjectGenerator: formatObjectGenerator,
    formatListGenerator: formatListGenerator,
    returnData: returnData
};
