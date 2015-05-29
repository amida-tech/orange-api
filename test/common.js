"use strict";
// Check a request returns status code 200 and has key success
// with value true
function success(res) {
    if (res.status !== 200) {
        throw new Error("Status code " + res.status + " not 200");
    }
    if (res.body.success !== true) {
        throw new Error("body.success " + res.body.success + " not true");
    }
}

// Converse of the above, but takes the error code we are looking for and the specific
// errors
function failure(errorCode, errors) {
    // Curry out as we want to check for different error codes (404, 500, etc)
    return function (res) {
        if (res.status !== errorCode) {
            throw new Error("Status code " + res.status + " not " + errorCode);
        }
        if (res.body.success !== false) {
            throw new Error("body.success " + res.body.success + " not false");
        }
        if (!('errors' in res.body && res.body.errors.length > 0)) {
            throw new Error("No error message specified in res.body");
        }
        if (typeof errors !== 'undefined') {
            // Check errors and res.body.errors are equal
            res.body.errors.sort();
            errors.sort();

            if (res.body.errors.length !== errors.length) {
                throw new Error("errors are " + res.body.errors.toString() + " not " + errors.toString());
            }

            for (var i = 0; i < errors.length; i++) {
                if (errors[i] !== res.body.errors[i]) {
                    throw new Error("errors are " + res.body.errors.toString() + " not " + errors.toString());
                }
            }
        }
    };
}

// Check a JSON response has exactly the specified keys
// Ignore error keys (checked in success/failure) and always require success key
function keys(keyList) {
    keyList.push('success');

    // Curry out so we can pass keyList
    return function (res) {
        var actualKeys = Object.keys(res.body);
        if (!('success' in res.body)) {
            throw new Error("success status not specified in res.body");
        }

        // Check all required keys present
        for (var i = 0; i < keyList.length; i++) {
            if (actualKeys.indexOf(keyList[i]) < 0) {
                throw new Error("Key " + keyList[i] + " not present but should be ");
            }
        }

        // Check no extra keys are present
        for (i = 0; i < actualKeys.length; i++) {
            var key = actualKeys[i];
            if (key !== 'errors' && keyList.indexOf(key) < 0) {
                throw new Error("Key " + key + " present but shouldn't be");
            }
        }
    };
}

module.exports = {
    success: success,
    failure: failure,
    keys: keys
};
