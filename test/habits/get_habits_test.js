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

describe("view patient habits (GET /patients/:patientid/habits)", function () {
    // setup test patients, users
    auth.setupTestUser(this);
    patients.setupTestPatients(this.user, 1, this);

    var noAuthChecker = function (patientId, responseCode, errors, accessToken) {
        requests.failsToShow(common.endpoint(patientId), responseCode, errors, accessToken);
    }.bind(this);

    var authChecker = function (patientId) {
        requests.successfullyShows(common.endpoint(patientId), keys, this.accessTokenGetter);
    }.bind(this);

    patients.requiresPatientAuthorization("read", noAuthChecker, authChecker, this);
});
