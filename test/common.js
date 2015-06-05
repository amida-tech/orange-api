"use strict";
var request = require('supertest');
var mongoose = require('mongoose');
var app = require('../app.js');
var util = require('util');

var factories = require('./factories.js');

// Check an object has exactly the specified keys
function keysData(keyList) {
    return function (obj) {
        var actualKeys = Object.keys(obj);

        // Check all required keys present
        for (var i = 0; i < keyList.length; i++) {
            if (actualKeys.indexOf(keyList[i]) < 0) {
                return new Error("Key " + keyList[i] + " not present but should be ");
            }
        }

        // Check no extra keys are present
        for (i = 0; i < actualKeys.length; i++) {
            var key = actualKeys[i];
            if (key !== 'errors' && keyList.indexOf(key) < 0) {
                return new Error("Key " + key + " present but shouldn't be");
            }
        }
    };
}

// Check a JSON response has exactly the specified keys
// Ignore error keys (checked in success/failure) and always require success key
function keys(keyList) {
    keyList.push('success');
    var checker = keysData(keyList);

    // Curry out so we can pass keyList
    return function (res) {
        var err = checker(res.body);
        if (err) throw err;
    };
}

// Converse of the above, but takes the error code we are looking for and the specific
// errors
function failure(errorCode, errors) {
    // Curry out as we want to check for different error codes (404, 500, etc)
    return function (res) {
        if (res.status !== errorCode) throw new Error("Status code " + res.status + " not " + errorCode);
        if (res.body.success !== false) throw new Error("body.success " + res.body.success + " not false");
        if (!('errors' in res.body && res.body.errors.length > 0)) throw new Error("No error message specified in res.body");
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
        // in specific case of 401 error code, we need a WWW-Authenticate header field
        if (errorCode === 401 && !(typeof res.get('WWW-Authenticate') !== 'undefined' && res.get('WWW-Authenticate').length > 0)) {
            throw new Error("401 status code but no WWW-Authenticate header");
        }
        // check no non-success/error fields are present
        keys([])(res);
    };
}

// create a new user and authenticate as them
// returns a User object with extra attributes plainPassword, accessToken
// and authHeader (do what they say on the tin)
function authenticate(callback) {
    var user = factories.user();
    user.save(function (err, data) {
        if (err) return callback(err);

        // get access token
        request(app).post('/v1/auth/token')
            .send({
                email: user.email,
                password: user.rawPassword
            })
            .end(function (err, res) {
                if (err) return callback(err);

                user.accessToken = res.body.access_token;
                user.authHeader = 'Bearer ' + user.accessToken;
                callback(null, user);
            });
    });
}

// Check a request returns status code 200/201 and has key success
// with value true
function success(responseCode, desiredKeys) {
    return function (res) {
        if (res.status !== responseCode) throw new Error("Status code " + res.status + " not " + responseCode);
        if (res.body.success !== true) throw new Error("body.success " + res.body.success + " not true");
        keys(desiredKeys)(res);
    };
}

// super-wrappers for above
function wrappers(endpoint, type) {
    var send = function (data, token, respCode, checker, callback) {
        var authHeaderKey = 'header-we-dont-care-about';
        var authHeaderVal = '';
        if (typeof token !== 'undefined' && token !== null && token.length > 0) {
            authHeaderKey = 'Authorization';
            authHeaderVal = 'Bearer ' + token;
        }
        var req;
        if (type === 'post') {
            req = request(app).post(endpoint);
        } else if (type === 'put') {
            req = request(app).put(endpoint);
        } else if (type === 'delete') {
            req = request(app).delete(endpoint);
        } else {
            req = request(app).get(endpoint);
        }
        req
            .set(authHeaderKey, authHeaderVal)
            .send(data)
            .expect(respCode)
            .expect(checker)
            .end(function (err, res) {
                if (err) console.log("Assertion fail body: " + util.inspect(res.body));
                callback(err, res);
            });
    };
    return {
        send: send,
        sendSuccess: function (data, token, respCode, keys, callback) {
            send(data, token, respCode, success(respCode, keys), callback);
        },
        sendFailure: function (data, token, respCode, keys, callback) {
            send(data, token, respCode, failure(respCode, keys), callback);
        },

    };
}

module.exports = {
    success: success,
    failure: failure,
    keys: keys,
    authenticate: authenticate,
    wrappers: wrappers,
    keysData: keysData
};
