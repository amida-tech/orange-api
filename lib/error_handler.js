"use strict";

var es = require("./errors.js");
var ERRORS = es.ERRORS;
var APICombinedError = es.APICombinedError;

// Middleware to handle errors and output an error response over the API

// flatten an error object (mongoose ValidationError, APIError, etc) into a list of APIErrors
// folds up err into errors (so call parseError(err, []) initially)
function parseError(err, errors) {
    // mongoose error with sub-errors
    if (err.name === "ValidationError") {
        var errorKeys = Object.keys(err.errors);
        for (var i = 0; i < errorKeys.length; i++) {
            // recurse ourselves on each of these errors
            errors = parseError(err.errors[errorKeys[i]], errors);
        }
        return errors;
    }

    // base mongoose error
    if (err.name === "ValidatorError" || err.name === "CastError") {
        // mongoose errors are ugly and we need to match them up to errors in ERRORS
        // idea is to use metadata to generate a key we think may be in ERRORS

        // get actual base field name (e.g., hours.monday.open => hours)
        var fullField = err.path.split(".")[0];
        // convert field name from camelCase to uppercase SNAKE_CASE
        var field = fullField.replace(/([a-z])([A-Z])/g, "$1_$2").toUpperCase();
        var testKey = "";

        // use a couple of heuristics to try and find the appropriate error
        // two kind of errors with invalid IDs:
        //      when finding a resource with ID in URL (thrown explicitly)
        //      when POSTing a child resource ID (e.g., a medication_id when creating an adherence): gives CastError
        //          or a required ValidatorError
        if ((err.name === "CastError" || err.kind === "required") && field.indexOf("_ID") >= 0) {
            // unpluralise
            field = field.replace("_IDS", "_ID");
            testKey = "INVALID_RESOURCE_" + field;
        } else if (err.kind === "regexp" || (typeof err.properties !== "undefined" && err.properties.kind === "enum")) {
            // regular expression or enum => invalid format
            testKey = "INVALID_" + field;
        } else if (err.kind === "required") {
            // required fields not present
            testKey = field + "_REQUIRED";
        } else {
            // set custom error message in models to be keys in ERRORS
            testKey = err.message;
        }

        // if an error matches
        if (testKey in ERRORS) {
            errors.push(ERRORS[testKey]);
            return errors;
        // otherwise try using the error message (it may have been custom set to an error's code)
        } else if (err.message in ERRORS) {
            errors.push(ERRORS[err.message]);
            return errors;
        }
    }

    // already an APIError
    if (err.name === "APIError") {
        errors.push(err);
        return errors;
    }

    // unknown case
    if (process.env.DEBUG) {
        console.log("Unknown error!");
        console.log(err.name);
        console.log(err);
        console.log("");
        throw err;
    } else {
        console.log("Unknown error!");
        console.log(err.name);
        console.log(err);
        console.log("");
        errors.push(ERRORS.UNKNOWN_ERROR);
        return errors;
    }
}

// handle errors by returning a JSON response with appropriate resp code
function errorHandler(err, req, res, next) {
    // don't do anything unless an error was thrown
    if (!err) return next();

    // parse err into an APICombinedError object
    var error = new APICombinedError(parseError(err, []));

    // if we send a 401 response, we also need to send the error code in a
    // WWW-Authenticate header as per www spec
    if (error.responseCode === 401) res.set("WWW-Authenticate", "Bearer realm='orange'");

    // send JSON error response
    res.status(error.responseCode);
    res.send({
        success: false,
        errors: error.slugs
    });
}

module.exports = errorHandler;
