"use strict";
var util            = require("util"),
    curry           = require("curry"),
    request         = require("request"),
    fs              = require("fs"),
    crypto          = require("crypto"),
    mongoose        = require("mongoose"),
    Q               = require("q"),
    config          = require("./config.js"),
    app             = require("./app.js"); // to setup models

// test data
var user, patient, accessToken, medication;

// connect to DB
Q.nbind(mongoose.connect, mongoose)("mongodb://localhost/orange-api").then(function () {
    // hackish unique email
    var email = util.format("%s@test.com", crypto.randomBytes(8).toString("hex"));
    var User = mongoose.model("User");
    return Q.nbind(User.create, User)({
        email: email,
        password: "testpassword",
        first_name: "Harold",
        last_name: "Ricardo"
    }).then(function (u) {
        user = u;
    });
}).then(function () {
    // generate access token
    var deferred = Q.defer();
    user.generateSaveAccessToken(function (err, t) {
        if (err) return deferred.reject(err);
        deferred.resolve(t);
        accessToken = t;
    });
    return deferred.promise;
}).then(function () {
    // setup test patient
    var Patient = mongoose.model("Patient");
    return Q.nbind(Patient.createForUser, Patient)({
        first_name: "Harold",
        last_name: "Ricardo"
    }, user).then(function (p) {
        patient = p;
    });
}).then(function () {
    // setup test doctor
    return Q.nbind(patient.createDoctor, patient)({
        name: "test doctor"
    });
}).then(function () {
    // setup test pharmacy
    return Q.nbind(patient.createPharmacy, patient)({
        name: "test pharmacy"
    });
}).then(function () {
    // setup test medication we have access to
    return Q.nbind(patient.createMedication, patient)({
        name: "test medication"
    }).then(function (m) {
        medication = m;
    });
}).then(function () {
    // create journal entry we have access to
    return Q.nbind(patient.createJournalEntry, patient)({
        date: (new Date()).toISOString(),
        text: "example journal entry",
        medication_ids: [medication._id]
    });
}).then(function() {
    // create dose event we have access to
    return Q.nbind(patient.createDose, patient)({
        medication_id: medication._id,
        date: (new Date()).toISOString(),
        taken: true
    });
}).then(function () {
    console.log("Test data generated");

    // get PDF dump and write to a temp file
    var deferred = Q.defer();
    request({
        url: util.format("http://localhost:3000/v1/patients/%d.pdf", patient._id),
        headers: {
            "X-Client-Secret": config.secret,
            "Authorization": util.format("Bearer %s", accessToken)
        }
    }).pipe(fs.createWriteStream("/tmp/orange.pdf")).on("close", function () {
        console.log("PDF Downloaded");
        deferred.resolve();
    });
    return deferred.promise;
}).done(function () {
    var spawn = require("child_process").spawn;
    spawn("open", ["/tmp/orange.pdf"], {
        detached: true
    });
    process.exit(0);
}, function (err) {
    throw err;
});
