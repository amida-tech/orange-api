"use strict";
var supertest = require('supertest');
var api = supertest('http://localhost:3000/v1');
var mongoose = require('mongoose');
var expect = require('chai').expect;

// Common test methods
var common = require('../common.js');
var factories = require('../factories.js');
var success = common.success,
    failure = common.failure,
    keys = common.keys,
    authenticate = common.authenticate;

describe('user habits', function () {
    describe('when authenticated', function () {
        var user, wake, sleep, breakfast, lunch, dinner;
        before(function (done) {
            // test data
            wake = factories.wake();
            sleep = factories.sleep();
            breakfast = factories.breakfast();
            lunch = factories.lunch();
            dinner = factories.dinner();
            // test user
            authenticate(function (err, u) {
                if (err) return done(err);
                user = u;
                done();
            });
        });

        it('should initially return blank values', function (done) {
            api.get('/user/habits')
                .set('Authorization', user.authHeader)
                .expect(success)
                .expect(keys(['wake', 'sleep', 'breakfast', 'lunch', 'dinner']))
                .end(function (err, res) {
                    if (err) return done(err);
                    expect(res.body.wake).to.equal('');
                    expect(res.body.sleep).to.equal('');
                    expect(res.body.breakfast).to.equal('');
                    expect(res.body.lunch).to.equal('');
                    expect(res.body.dinner).to.equal('');
                    done();
                });
        });

        it('should let us update those values', function (done) {
            api.put('/user/habits')
                .set('Authorization', user.authHeader)
                .send({
                    wake: wake,
                    sleep: sleep,
                    breakfast: breakfast,
                    lunch: lunch,
                    dinner: dinner
                })
                .expect(success)
                .expect(keys(['wake', 'sleep', 'breakfast', 'lunch', 'dinner']))
                .end(function (err, res) {
                    if (err) return done(err);
                    expect(res.body.wake).to.equal(wake);
                    expect(res.body.sleep).to.equal(sleep);
                    expect(res.body.breakfast).to.equal(breakfast);
                    expect(res.body.lunch).to.equal(lunch);
                    expect(res.body.dinner).to.equal(dinner);
                    done();
                });
        });

        it('should persist those values', function (done) {
            api.get('/user/habits')
                .set('Authorization', user.authHeader)
                .expect(success)
                .expect(keys(['wake', 'sleep', 'breakfast', 'lunch', 'dinner']))
                .end(function (err, res) {
                    if (err) return done(err);
                    expect(res.body.wake).to.equal(wake);
                    expect(res.body.sleep).to.equal(sleep);
                    expect(res.body.breakfast).to.equal(breakfast);
                    expect(res.body.lunch).to.equal(lunch);
                    expect(res.body.dinner).to.equal(dinner);
                    done();
                });
        });

        describe('with invalid times', function (done) {
            var invalidWake = 'adfhjkasd';

            it('should give us an error', function (done) {
                api.put('/user/habits')
                    .set('Authorization', user.authHeader)
                    .send({
                        wake: invalidWake
                    })
                    .expect(400)
                    .expect(failure(400, ['invalid_wake']))
                    .end(done);
            });

            it('should not have changed values', function (done) {
                api.get('/user/habits')
                    .set('Authorization', user.authHeader)
                    .expect(success)
                    .expect(keys(['wake', 'sleep', 'breakfast', 'lunch', 'dinner']))
                    .end(function (err, res) {
                        if (err) return done(err);
                        expect(res.body.wake).to.equal(wake);
                        expect(res.body.sleep).to.equal(sleep);
                        expect(res.body.breakfast).to.equal(breakfast);
                        expect(res.body.lunch).to.equal(lunch);
                        expect(res.body.dinner).to.equal(dinner);
                        done();
                    });
            });
        });

        describe('when only changing some values', function () {
            // make sure factories.wake() is not static!!
            var newWake;
            do {
                newWake = factories.wake();
            } while (newWake === wake);

            it('should change just those values', function (done) {
                api.put('/user/habits')
                    .set('Authorization', user.authHeader)
                    .send({
                        wake: newWake
                    })
                    .expect(success)
                    .expect(keys(['wake', 'sleep', 'breakfast', 'lunch', 'dinner']))
                    .end(function (err, res) {
                        if (err) return done(err);
                        expect(res.body.wake).to.equal(newWake);
                        expect(res.body.sleep).to.equal(sleep);
                        expect(res.body.breakfast).to.equal(breakfast);
                        expect(res.body.lunch).to.equal(lunch);
                        expect(res.body.dinner).to.equal(dinner);
                        done();
                    });
            });
        });

        describe('with a blank value', function () {
            it('should change make that value blank', function (done) {
                api.put('/user/habits')
                    .set('Authorization', user.authHeader)
                    .send({
                        wake: ""
                    })
                    .expect(success)
                    .expect(keys(['wake', 'sleep', 'breakfast', 'lunch', 'dinner']))
                    .end(function (err, res) {
                        if (err) return done(err);
                        expect(res.body.wake).to.equal("");
                        expect(res.body.sleep).to.equal(sleep);
                        expect(res.body.breakfast).to.equal(breakfast);
                        expect(res.body.lunch).to.equal(lunch);
                        expect(res.body.dinner).to.equal(dinner);
                        done();
                    });
            });
        });

    });

    describe('when not authenticated', function () {
        describe('when viewing', function () {
            it('should return an error', function (done) {
                api.get('/user/habits')
                    .expect(401)
                    .expect(failure(401, ['access_token_required']))
                    .end(done);
            });
        });

        describe('when editing', function () {
            it('should return an error', function (done) {
                api.put('/user/habits')
                    .send({
                        wake: factories.wake()
                    })
                    .expect(401)
                    .expect(failure(401, ['access_token_required']))
                    .end(done);
            });
        });
    });
});
