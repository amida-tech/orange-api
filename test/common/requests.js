"use strict";
var expect      = require("chai").expect,
    util        = require("util"),
    async       = require("async"),
    request     = require("supertest")("http://localhost:3000/v1/"),
    responses   = require("../common/responses.js");

var requests = module.exports = {};

// store response abstraction
function storeRes(done, err, res) {
    if (err) return done(err);
    this.res = res;
    done();
}

function generateAuthHeader(token) {
    // access token may be a getter function
    if (!!(token && token.constructor && token.call && token.apply)) token = token();
    // if token is not present we don't want to send any header
    if (typeof token === 'undefined' || !token || token.length === 0)
        return undefined;
    return "Bearer " + token;
}

requests.successfullyCreates = function (endpoint, data, keys, accessToken) {
    // POST data to endpoint
    before(function (done) {
        var authHeader = generateAuthHeader(accessToken);
        request.post(endpoint).set('Authorization', authHeader).send(data).end(async.apply(storeRes.bind(this), done));
    });
    responses.isASuccessfulCreateResponse(keys);
};
requests.failsToCreate = function (endpoint, data, responseCode, errors, accessToken) {
    // POST data to endpoint
    before(function (done) {
        var authHeader = generateAuthHeader(accessToken);
        // have to explicitly set the response code we're looking for as otherwise
        // supertest throws errors on response codes apart from 200/1/2
        request.post(endpoint).set('Authorization', authHeader).send(data).expect(responseCode).end(async.apply(storeRes.bind(this), done));
    });
    responses.isAFailedCreateResponse(responseCode, errors);
};

requests.successfullyEdits = function (endpoint, data, keys, accessToken) {
    // PUT data to endpoint
    before(function (done) {
        var authHeader = generateAuthHeader(accessToken);
        request.put(endpoint).set('Authorization', authHeader).send(data).end(async.apply(storeRes.bind(this), done));
    });
    responses.isASuccessfulEditResponse(keys);
};
requests.failsToEdit = function (endpoint, data, responseCode, errors, accessToken) {
    // PUT data to endpoint
    before(function (done) {
        var authHeader = generateAuthHeader(accessToken);
        request.put(endpoint).set('Authorization', authHeader).send(data).expect(responseCode).end(async.apply(storeRes.bind(this), done));
    });
    responses.isAFailedEditResponse(responseCode, errors);
};

requests.successfullyShows = function (endpoint, keys, accessToken) {
    // GET data from endpoint
    before(function (done) {
        var authHeader = generateAuthHeader(accessToken);
        request.get(endpoint).set('Authorization', authHeader).end(async.apply(storeRes.bind(this), done));
    });
    responses.isASuccessfulShowResponse(keys);
}
requests.failsToShow = function (endpoint, responseCode, errors, accessToken) {
    // GET data from endpoint
    before(function (done) {
        var authHeader = generateAuthHeader(accessToken);
        request.get(endpoint).set('Authorization', authHeader).expect(responseCode).end(async.apply(storeRes.bind(this), done));
    });
    responses.isAFailedShowResponse(responseCode, errors);
}
