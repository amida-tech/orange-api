var factories = require('../factories.js');
var request = require('supertest');
var app = require('../../app.js');

// make simple user info request to check we're authenticated properly
// takes request containing access token
// first parameter
function checkAuthenticated(res, callback) {
    // gen auth header
    var authHeader = 'Bearer ' + res.body.access_token;
    // check we can get user info with access token
    request(app).get('/v1/user').set('Authorization', authHeader).expect(200, callback);
}

// create and save user we can use to authenticate
function createUser(callback) {
    var user = factories.user();
    user.save(function (err, sUser) {
        if (err) return callback(err);
        sUser.rawPassword = user.rawPassword;
        callback(null, sUser);
    });
    return user;
}

module.exports = {
    checkAuthenticated: checkAuthenticated,
    createUser: createUser
};
