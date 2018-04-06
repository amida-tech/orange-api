"use strict";
// Various different helper functions useful to DRY up code in basic CRUD
// controllers

// not moving all of below into proto class because this way allow us to
// potentially use different keys for different routes, so way more modular

// select a list of keys from object
function filter(obj, keys) {
    var filtered = {};
    for (var key in obj) {
        if (keys.indexOf(key) >= 0) filtered[key] = obj[key];
    }
    return filtered;
}

// safe input: select only the required keys from the input data, so we have
// an object that can safely be passed straight into model methods
function filterInputGenerator(keys) {
    return function (req, res, next) {
        req.data = filter(req.body, keys);
        next();
    };
}

// safe output: select only the desired keys from output data, so model methods can
// be chained straight into this
// only for successful output: all errors should already have been escalated at this point
// unless noid is true, the response will contain the object's ID
function formatObjectGenerator(keys, noid) {
    return function (statusCode) {
        return function (req, res) {
            // if res.data responds to getData, call it (this does things like convert
            // between snake case and camel case, and remove doctor_id if doctor is
            // populated)
            if (typeof res.data.getData === "function") res.data = res.data.getData(req.patient);

            var output = filter(res.data, keys);
            output.success = true;
            if (typeof noid === "undefined" || !noid) output.id = res.data._id;
            res.status(statusCode);
            res.send(output);
        };
    };
}

// the same as formatObjectGenerator, but for a list of datums
function formatListGenerator(keys, slug) {
    return function (req, res) {
        var data = [];
        for (var i = 0; i < res.data.length; i++) {
            var rawDatum = res.data[i];
            // if rawDatum responds to getData, call it (see formatObjectGenerator for explanation)
            if (typeof rawDatum.getData === "function") rawDatum = rawDatum.getData(req.patient);

            var datum = filter(rawDatum, keys);
            //TODO: Understand how after filter there magically appears an avatar URI
            datum.id = rawDatum._id;
            data.push(datum);
        }

        // default to counting length of data
        var count = res.count;
        if (typeof count !== "number") count = data.length;

        var resp = {
            count: count,
            success: true
        };
        resp[slug] = data;
        res.send(resp);
    };
}

// a DRY callback to save data into res.data (to be used by the methods above
// e.g., formatObject)
function returnData(res, next) {
    return function (err, obj) {
        if (err) return next(err);
        res.data = obj;
        next();
    };
}
function returnListData(res, next) {
    return function (err, objs, count) {
        if (err) return next(err);
        res.data = objs;
        res.count = count;
        next();
    };
}


module.exports = {
    filterInputGenerator: filterInputGenerator,
    formatObjectGenerator: formatObjectGenerator,
    formatListGenerator: formatListGenerator,
    returnData: returnData,
    returnListData: returnListData,
    filter: filter
};
