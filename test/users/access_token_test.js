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
