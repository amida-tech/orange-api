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
