"use strict";
var chakram     = require("chakram"),
    fixtures    = require("./fixtures.js"),
    mongoose    = require("mongoose"),
    Q           = require("q"),
    auth        = require("../common/auth.js");
var expect = chakram.expect;

var User = mongoose.model("User");

describe("Users", function () {
    describe("Registration Endpoint (POST /user)", function () {
        var registerNoAuth = function (data) {
            return fixtures.build("User", data).then(function (user) {
                // auth.genAuthHeaders(undefined) sets X-Client-Secret for us, and doesn't set any
                // access token header
                return chakram.post("http://localhost:5000/v1/user", user, auth.genAuthHeaders(undefined));
            });
        };

        // check access token authentication
        auth.itRequiresAuthentication(registerNoAuth);

        const programAdministratorUser = {
            email: "pa@example.com",
            role: "programAdministrator"
        };
        let adminHeaders;
        var registerAsAdmin = function (data) {
            return auth.genAdminAccessToken()
            .then(auth.genAuthHeaders)
            .then(function (headers) {
                adminHeaders = headers;
            })
            .then(function () {
                return fixtures.build("User", data);
            })
            .then(function (user) {
                return chakram.post("http://localhost:5000/v1/user", user, adminHeaders);
            });
        };
        it("returns a successful response as admin even though admin doesn't have a user", function () {
            // this also creates the programAdministrator user that will be used for the rest of the tests
            return expect(registerAsAdmin(programAdministratorUser)).to.be.a.user.registerSuccess;
        });

        var register = function (data) {
            let programAdministratorHeaders;
            return auth.genAccessToken(programAdministratorUser, true)
            .then(auth.genAuthHeaders)
            .then(function (headers) {
                programAdministratorHeaders = headers;
            })
            .then(function () {
                return fixtures.build("User", data);
            })
            .then(function (user) {
                return chakram.post("http://localhost:5000/v1/user", user, programAdministratorHeaders);
            });
        };

        // all valid data
        it("returns a successful response", function () {
            return expect(register()).to.be.a.user.registerSuccess;
        });

        // require email and role
        it("requires an email", function () {
            return expect(register({ email: undefined })).to.be.an.api.error(400, "email_required");
        });
        it("rejects a blank email", function () {
            return expect(register({ email: "" })).to.be.an.api.error(400, "email_required");
        });
        it("rejects a null email", function () {
            return expect(register({ email: null })).to.be.an.api.error(400, "email_required");
        });
        it("rejects a null role", function () {
            return expect(register({ role: null })).to.be.an.api.error(400, "invalid_role");
        });
        it("rejects a role not in enum", function () {
            return expect(register({ role: "notintheenum" })).to.be.an.api.error(400, "invalid_role");
        });
        it("does not require a first name", function () {
            return expect(register({ first_name: undefined })).to.be.a.user.registerSuccess;
        });
        it("accepts a blank first name", function () {
            return expect(register({ first_name: "" })).to.be.a.user.registerSuccess;
        });
        it("does not require a last name", function () {
            return expect(register({ last_name: undefined })).to.be.a.user.registerSuccess;
        });
        it("accepts a blank last name", function () {
            return expect(register({ last_name: "" })).to.be.a.user.registerSuccess;
        });
        it("does not require a phone", function () {
            return expect(register({ phone: undefined })).to.be.a.user.registerSuccess;
        });
        it("accepts a blank phone", function () {
            return expect(register({ phone: "" })).to.be.a.user.registerSuccess;
        });

        // require valid email
        it("rejects an invalid email", function () {
            return expect(register({ email: "foobar" })).to.be.an.api.error(400, "invalid_email");
        });
        it("allows + sign in email", function () {
            return expect(register({ email: "foobar+baz@example.com" })).to.be.a.user.registerSuccess;
        });

        // duplication
        it("does not allow duplicate email addresses", function () {
            // create existing user then check we can't reregister with same email address
            return fixtures.create("User").then(function (user) {
                return expect(register({email: user.email})).to.be.an.api.error(400, "user_already_exists");
            });
        });

        it("creates a patient for me", function () {
            // auth.genAuthHeaders sends client secret
            var headers = auth.genAuthHeaders(undefined);

            // build but don't save user with full data
            var newUser = fixtures.build("User", {
                firstName: "Test",
                lastName: "User",
                phone: "6177140900"
            });
            // register user at endpoint
            var registerUser = function (inst) {
                // camel case keys override
                var user = inst.toObject();
                user.first_name = user.firstName;
                user.last_name = user.lastName;

                return chakram.post("http://localhost:5000/v1/user", user, adminHeaders).then(function () {
                    return user;
                });
            };
            // use user credentials to authenticate and get access token
            // need to get user we just made out of DB to avoid duplication errors
            var token = function (userData) {
                var deferred = Q.defer();
                User.findOne({ email: userData.email }, function(err, user) {
                    if (err) {
                        deferred.reject(err);
                    }
                    deferred.resolve(auth.genAccessToken(user, true));
                });
                return deferred.promise;
            };
            // get list of all patients
            var list = function (accessToken) {
                var authHeaders = auth.genAuthHeaders(accessToken);
                return chakram.get("http://localhost:5000/v1/patients", authHeaders);
            };
            return newUser.then(registerUser).then(token).then(list).then(function (response) {
                // check we have exactly one patient
                expect(response.body.patients).to.be.an("array");
                expect(response.body.patients.length).to.equal(1);
                // check it has the right name and phone number
                var patient = response.body.patients[0];
                expect(patient.first_name).to.equal("Test");
                expect(patient.last_name).to.equal("User");
                expect(patient.phone).to.equal("6177140900");
                // check it has me set to true
                expect(patient.me).to.equal(true);
            });
        });
    });
});
