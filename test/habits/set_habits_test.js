var mongoose    = require("mongoose"),
    expect      = require("chai").expect,
    async       = require("async"),
    util        = require("util"),
    requests    = require("../common/requests.js"),
    factories   = require("../common/factories.js"),
    auth        = require("../common/auth.js"),
    crud        = require("../common/crud.js"),
    patients    = require("../patients/common.js"),
    common      = require("./common.js");

var keys = ["wake", "sleep", "breakfast", "lunch", "dinner"];

describe("set patient habits (PUT /patients/:patientid/habits)", function () {
    // setup test patients, users
    auth.setupTestUser(this);
    patients.setupTestPatients(this.user, 1, this);

    var noAuthChecker = function (patientId, responseCode, errors, accessToken) {
        requests.failsToEdit(common.endpoint(patientId), {}, responseCode, errors, accessToken);
    }.bind(this);

    var authChecker = function (patientId) {
        // DRY up checking for success and failure (assuming authentication)
        var success = function (data) {
            requests.successfullyEdits(common.endpoint(patientId), keys, data, this.accessTokenGetter);
        }.bind(this);
        var failure = function (data, responseCode, errors) {
            requests.failsToEdit(common.endpoint(patientId), data, responseCode, errors, this.accessTokenGetter);
        }.bind(this);

        describe("with full data", function () {
            success({
                wake: factories.time(),
                sleep: factories.time(),
                breakfast: factories.time(),
                lunch: factories.time(),
                dinner: factories.time(),
            });
        });
        
        describe("with partial data", function () {
            success({
                lunch: factories.time()
            });
        });

        describe("with invalid data", function () {
            failure({
                wake: factories.time(),
                sleep: factories.time(),
                breakfast: factories.invalidTime(),
                lunch: factories.time(),
                dinner: factories.time(),
            }, 400, 'invalid_breakfast');
        });
    }.bind(this);

    patients.requiresPatientAuthorization("write", noAuthChecker, authChecker, this);
});
