"use strict";
var supertest = require('supertest');
var api = supertest('http://localhost:3000/v1');
var mongoose = require('mongoose');

// Common test methods
var common = require('../common.js');
var factories = require('../factories.js');
var success = common.success,
    failure = common.failure,
    keys = common.keys,
    authenticate = common.authenticate;

describe('user info', function () {
    describe('when authenticated', function () {
        // beforeEach because we're playing around with revoking access tokens in here
        var user;
        beforeEach(function (done) {
            authenticate(function (err, u) {
                if (err) return done(err);
                user = u;
                done();
            });
        });

        describe('when viewing', function () {
            it('should return user info', function (done) {
                api.get('/user')
                    .set('Authorization', user.authHeader)
                    .expect(success)
                    .expect(keys(['email', 'name']))
                    .end(done);
            });
        });

        describe('when editing', function () {
            describe('when changing password', function () {
                it('should change the password', function (done) {
                    api.put('/user')
                        .set('Authorization', user.authHeader)
                        .send({
                            password: user.plainPassword + "new"
                        })
                        .expect(success)
                        .expect(keys(['email', 'name']))
                        .end(done);
                });
                it('should revoke our access token', function (done) {
                    api.put('/user')
                        .set('Authorization', user.authHeader)
                        .send({
                            password: user.plainPassword + "new"
                        })
                        .end(function (err, res) {
                            api.get('/user')
                                .set('Authorization', user.authHeader)
                                .expect(401)
                                .end(done);
                        });
                });
            });

            describe('when changing name', function () {
                it('should change the name', function (done) {
                    api.put('/user')
                        .set('Authorization', user.authHeader)
                        .send({
                            name: user.name + "someMore"
                        })
                        .expect(success)
                        .expect(keys(['email', 'name']))
                        .end(done);
                });
                it('should not revoke our access token', function (done) {
                    api.get('/user')
                        .set('Authorization', user.authHeader)
                        .expect(200)
                        .end(done);
                });
            });
        });
    });

    // just test this on one endpoint to make sure authentication is doing
    // something non-trivial
    describe('when authenticated with invalid access token', function () {
        it('should return an error', function (done) {
            api.get('/user')
                .set('Authorization', 'Bearer probablynotanaccesstoken')
                .expect(401)
                .expect(failure(401, ['invalid_access_token']))
                .end(done);
        });
    });

    describe('when not authenticated', function () {
        describe('when viewing', function () {
            it('should return an error', function (done) {
                api.get('/user')
                    .expect(401)
                    .expect(failure(401, ['access_token_required']))
                    .end(done);
            });
        });

        describe('when editing', function () {
            it('should return an error', function (done) {
                api.put('/user')
                    .expect(401)
                    .expect(failure(401, ['access_token_required']))
                    .end(done);
            });
        });
    });
});
