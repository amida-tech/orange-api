"use strict";
var expect      = require("chai").expect,
    util        = require("util"),
    async       = require("async"),
    request     = require("supertest")("http://localhost:3000/v1/"),
    responses   = require("../common/responses.js");

var requests = module.exports = {};

// store response abstraction
function storeRes(done, err, res) {
    if (err) {
        // output errors for debugging as mocha's stacktrace is useless here
        console.log(res.body);
        return done(err);
    }
    this.res = res;
    done();
}

// endpoint may be a getter function
function parseEndpoint(endpoint) {
    if (!!(endpoint && endpoint.constructor && endpoint.call && endpoint.apply)) return endpoint();
    return endpoint;
}

function generateAuthHeader(token) {
    // access token may be a getter function
    if (!!(token && token.constructor && token.call && token.apply)) token = token();
    // if token is not present we don't want to send any header
    if (typeof token === 'undefined' || !token || token.length === 0)
        return undefined;
    return "Bearer " + token;
}

requests.isGenericRequest = requests.genericRequest = function (getEndpoint, method, data, responseCode, accessToken, posthook) {
    before(function (done) {
        // endpoint may be a getter function
        var endpoint = parseEndpoint(getEndpoint);
        // handles undefineds
        var authHeader = generateAuthHeader(accessToken);

        request[method](endpoint).set('Authorization', authHeader).send(data).expect(responseCode).end(function (err, res) {
            // run both, but posthook is optional
            if (typeof posthook !== 'undefined') posthook(err, res);
            storeRes.bind(this)(done, err, res);
        }.bind(this));
    });
};


// POST
requests.successfullyCreates = function (endpoint, keys, data, accessToken) {
    requests.isGenericRequest(endpoint, 'post', data, 201, accessToken);
    responses.isASuccessfulCreateResponse(keys);
};
requests.failsToCreate = function (endpoint, data, responseCode, errors, accessToken) {
    requests.isGenericRequest(endpoint, 'post', data, responseCode, accessToken);
    responses.isAFailedCreateResponse(responseCode, errors);
};

// PUT
requests.successfullyEdits = function (endpoint, keys, data, accessToken) {
    requests.isGenericRequest(endpoint, 'put', data, 200, accessToken);
    responses.isASuccessfulEditResponse(keys);
};
requests.failsToEdit = function (endpoint, data, responseCode, errors, accessToken) {
    requests.isGenericRequest(endpoint, 'put', data, responseCode, accessToken);
    responses.isAFailedEditResponse(responseCode, errors);
};

// GET (one)
requests.successfullyShows = function (endpoint, keys, accessToken) {
    requests.isGenericRequest(endpoint, 'get', {}, 200, accessToken);
    responses.isASuccessfulShowResponse(keys);
}
requests.failsToShow = function (endpoint, responseCode, errors, accessToken) {
    requests.isGenericRequest(endpoint, 'get', {}, responseCode, accessToken);
    responses.isAFailedShowResponse(responseCode, errors);
};

// GET (list)
requests.successfullyLists = function (endpoint, slug, keys, data, accessToken) {
    requests.isGenericRequest(endpoint, 'get', data, 200, accessToken);
    responses.isASuccessfulListResponse(slug, keys);
}
requests.failsToList = function (endpoint, data, responseCode, errors, accessToken) {
    requests.isGenericRequest(endpoint, 'get', data, responseCode, accessToken);
    responses.isAFailedListResponse(responseCode, errors);
};

// DELETE
requests.successfullyDeletes = function (endpoint, keys, accessToken) {
    requests.isGenericRequest(endpoint, 'delete', {}, 200, accessToken);
    responses.isASuccessfulShowResponse(keys);
}
requests.failsToDelete = function (endpoint, responseCode, errors, accessToken) {
    requests.isGenericRequest(endpoint, 'delete', {}, responseCode, accessToken);
    responses.isAFailedShowResponse(responseCode, errors);
};
