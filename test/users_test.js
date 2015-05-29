"use strict";
var supertest = require('supertest');
var api = supertest('http://localhost:3000/v1');
var mongoose = require('mongoose');

// Common test methods
var common = require('./common.js');
var factories = require('./factories.js');
var success = common.success,
    failure = common.failure,
    keys = common.keys;

describe('registration', function () {
    it('should register', function (done) {
        api.post('/user')
            .send({
                email: factories.email(),
                password: factories.password(),
                name: factories.name()
            })
            .expect(success)
            .expect(keys(['email', 'name']))
            .end(done);
    });

    describe('with no email', function () {
        it('should not register', function (done) {
            api.post('/user')
                .send({
                    password: factories.password(),
                    name: factories.name()
                })
                .expect(500)
                .expect(failure(500, ['email_required']))
                .expect(keys(['email', 'name']))
                .end(done);
        });
    });

    describe('with no password', function () {
        it('should not register', function (done) {
            api.post('/user')
                .send({
                    email: factories.email(),
                    name: factories.name()
                })
                .expect(500)
                .expect(failure(500, ['password_required']))
                .expect(keys(['email', 'name']))
                .end(done);
        });
    });

    describe('with no name', function () {
        it('should register', function (done) {
            api.post('/user')
                .send({
                    email: factories.email(),
                    password: factories.password()
                })
                .expect(success)
                .expect(keys(['email', 'name']))
                .end(done);
        });
    });

    describe('with invalid email', function () {
        it('should not register', function (done) {
            api.post('/user')
                .send({
                    email: 'foo',
                    password: factories.password(),
                    name: factories.name()
                })
                .expect(500)
                .expect(failure(500, ['invalid_email']))
                .expect(keys(['email', 'name']))
                .end(done);
        });
    });

    describe('with existing email', function () {
        it('should not register', function (done) {
            var mEmail = factories.email();
            api.post('/user')
                .send({
                    email: mEmail,
                    password: factories.password(),
                    name: factories.name()
                })
                .end(function (err, res) {
                    if (err) {
                        throw err;
                    }
                    // Re register the user
                    api.post('/user')
                        .send({
                            email: mEmail,
                            password: factories.password(),
                            name: factories.name()
                        })
                        .expect(500)
                        .expect(failure(500, ['user_already_exists']))
                        .expect(keys(['email', 'name']))
                        .end(done);
                });
        });
    });
});

describe('getting an access token', function () {
    var user, password;
    before(function (done) {
        user = factories.user();
        // save password as user.password will become the hash
        password = user.password;
        user.save(done);
    });

    it('should return an access token', function (done) {
        api.post('/auth/token')
            .send({
                email: user.email,
                password: password
            })
            .expect(success)
            .expect(keys(['access_token']))
            .end(function (err, res) {
                if (err) {
                    throw err;
                }
                // Access token should let us access protected resources
                var token = res.body.access_token;
                api.get('/user')
                    .set('Authorization', 'Bearer ' + token)
                    .expect(200).end(done);
            });
    });

    describe('with no password', function () {
        it('should return an error', function (done) {
            api.post('/auth/token')
                .send({
                    email: user.email
                })
                .expect(403)
                .expect(failure(403, ['password_required']))
                .expect(keys([]))
                .end(done);
        });
    });

    describe('with no email', function () {
        it('should return an error', function (done) {
            api.post('/auth/token')
                .send({
                    password: user.password
                })
                .expect(403)
                .expect(failure(403, ['email_required']))
                .expect(keys([]))
                .end(done);
        });
    });

    describe('with invalid email/password combination', function () {
        it('should return an error', function (done) {
            api.post('/auth/token')
                .send({
                    email: user.email,
                    password: user.password + "1"
                })
                .expect(403)
                .expect(failure(403, ['invalid_email_password']))
                .expect(keys([]))
                .end(done);
        });
    });
});

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
