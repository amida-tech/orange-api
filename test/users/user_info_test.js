"use strict";
var supertest = require('supertest');
var api = supertest('http://localhost:3000/v1');
var mongoose = require('mongoose');

// Common test methods
var common = require('../common.js');
var factories = require('../factories.js');
var success = common.success,
    failure = common.failure,
    keys = common.keys;

describe('user info', function () {
    describe('when authenticated', function () {
        var user, password, accessToken, authHeader;

        // beforeEach because we're playing around with revoking access tokens in here
        beforeEach(function (done) {
            user = factories.user();
            // store password separately as user.password becomes the hash
            password = user.password;
            user.save(function (err, data) {
                if (err) {
                    done(err);
                }
                // get access token
                api.post('/auth/token')
                    .send({
                        email: user.email,
                        password: password
                    })
                    .end(function (err, res) {
                        if (err) {
                            done(err);
                        }
                        accessToken = res.body.access_token;
                        authHeader = 'Bearer ' + accessToken;
                        done();
                    });
            });
        });

        describe('when viewing', function () {
            it('should return user info', function (done) {
                api.get('/user')
                    .set('Authorization', authHeader)
                    .expect(success)
                    .expect(keys(['email', 'name']))
                    .end(done);
            });
        });

        describe('when editing', function () {
            describe('when changing password', function () {
                it('should change the password', function (done) {
                    api.put('/user')
                        .set('Authorization', authHeader)
                        .send({
                            password: password + "new"
                        })
                        .expect(success)
                        .expect(keys(['email', 'name']))
                        .end(done);
                });
                it('should revoke our access token', function (done) {
                    api.put('/user')
                        .set('Authorization', authHeader)
                        .send({
                            password: password + "new"
                        })
                        .end(function (err, res) {
                            api.get('/user')
                                .set('Authorization', authHeader)
                                .expect(403)
                                .end(done);
                        });
                });
            });

            describe('when changing name', function () {
                it('should change the name', function (done) {
                    api.put('/user')
                        .set('Authorization', authHeader)
                        .send({
                            name: user.name + "someMore"
                        })
                        .expect(success)
                        .expect(keys(['email', 'name']))
                        .end(done);
                });
                it('should not revoke our access token', function (done) {
                    api.get('/user')
                        .set('Authorization', authHeader)
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
                .expect(403)
                .expect(failure(403, ['invalid_access_token']))
                .expect(keys([]))
                .end(done);
        });
    });

    describe('when not authenticated', function () {
        describe('when viewing', function () {
            it('should return an error', function (done) {
                api.get('/user')
                    .expect(403)
                    .expect(failure(403, ['access_token_required']))
                    .expect(keys([]))
                    .end(done);
            });
        });

        describe('when editing', function () {
            it('should return an error', function (done) {
                api.put('/user')
                    .expect(403)
                    .expect(failure(403, ['access_token_required']))
                    .expect(keys([]))
                    .end(done);
            });
        });
    });
});
