"use strict";

var es = require('./errors.js');
var ERRORS = es.ERRORS;
var APICombinedError = es.APICombinedError;

// parse an error object (mongoose ValidationError, APIError, etc) into a list of APIErrors
// folds up err into errors
function parseError(err, errors) {
    // mongoose error with sub-errors
    if (err.name === 'ValidationError') {
        var errorKeys = Object.keys(err.errors);
        for (var i = 0; i < errorKeys.length; i++) {
            // recurse ourselves on each of these errors
            errors = parseError(err.errors[errorKeys[i]], errors);
        }
        return errors;
    }

    // base mongoose error
    if (err.name === 'ValidatorError') {
        // mongoose errors are ugly and we need to match them up to errors in ERRORS
        // idea is to use metadata to generate a key we think may be in ERRORS

        // convert field name from camelCase to uppercase SNAKE_CASE
        var field = err.path.replace(/([a-z])([A-Z])/g, '$1_$2').toUpperCase();
        var testKey = '';

        if (err.kind === 'regexp') {
            // regular expression => invalid format
            testKey = 'INVALID_' + field;
        } else if (err.kind === 'required') {
            // required fields not present
            testKey = field + '_REQUIRED';
        } else {
            // set custom error message in models to be keys in ERRORS
            testKey = err.message;
        }

        if (testKey in ERRORS) {
            errors.push(ERRORS[testKey]);
            return errors;
        }
    }

    // already an APIError
    if (err.name === 'APIError') {
        errors.push(err);
        return errors;
    }

    // unknown case
    if (process.env.DEBUG) {
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
    if (!err) {
        return next();
    }

    // parse err into an APICombinedError object
    var error = new APICombinedError(parseError(err, []));

    // send JSON error response
    res.status(error.responseCode);
    res.send({
        success: false,
        errors: error.slugs
    });
}

module.exports = errorHandler;
