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
var options = {};
if (config.ssl) {
    options.server = {};
    options.server.ssl = config.ssl;
    if (config.ssl_ca_cert) {
        options.server.sslCA = config.ssl_ca_cert;
    }
}
Q.nbind(mongoose.connect, mongoose)(config.mongo, options).then(function () {
    // hackish unique email
    var email = util.format("%s@test.com", crypto.randomBytes(4).toString("hex"));
    var User = mongoose.model("User");
    return Q.nbind(User.create, User)({
        email: email,
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
        name: "Atmoxetine",
        brand: "Strattera (18mg)",
        schedule: {
            as_needed: false,
            regularly: true,
            until: { type: "date", stop: "2015-07-15" },
            frequency: {
                n: 1,
                unit: "day",
                exclude: { exclude: [5, 6], repeat: 7 },
                start: "2015-08-10"
            },
            times: [
                { type: "exact", time: "09:00" },
                { type: "event", event: "lunch", when: "after" },
                { type: "event", event: "sleep", when: "before" }
            ],
            take_with_food: null,
            take_with_medications: [],
            take_without_medications: []
        }
    }).then(function (m) {
        medication = m;
    });
}).then(function () {
    return Q.nbind(patient.createMedication, patient)({
        name: "Efavirenz/Emtricitabine/Tenofov",
        brand: "Atripla",
        schedule: {
            as_needed: false,
            regularly: true,
            until: { type: "forever" },
            frequency: { n: 1, unit: "day" },
            times: [{ type: "event", event: "breakfast", when: "after" }],
            take_with_food: true,
            take_with_medications: [],
            take_without_medications: []
        }
    });
}).then(function () {
    return Q.nbind(patient.createMedication, patient)({
        name: "Tretinoin",
        brand: "Renova",
        schedule: {
            as_needed: true,
            regularly: false
        }
    });
}).then(function () {
    return Q.nbind(patient.createMedication, patient)({
        name: "Tylenol",
        brand: "Acetaminophen",
        schedule: {
            as_needed: false,
            regularly: true,
            until: { type: "forever" },
            frequency: { n: 3, unit: "month", exclude: { exclude: [3], repeat: 4 } },
            times: [{ type: "unspecified" }],
            take_with_food: null,
            take_with_medications: [],
            take_without_medications: []
        }
    });
}).then(function () {
    // doesn't pass validation
    //return Q.nbind(patient.createMedication, patient)({
        //name: "",
        //brand: "iAmANamelessMedication"
    //});
}).then(function () {
    /*
    return Q.nbind(patient.createMedication, patient)({
        name: "iAmABrandlessMedication",
        brand: "",
        schedule: {
            as_needed: false,
            regularly: true,
            until: { type: "forever" },
            frequency: { n: 3, unit: "month", exclude: { exclude: [3], repeat: 4 } },
            times: [{ type: "unspecified" }],
            take_with_food: null,
            take_with_medications: [],
            take_without_medications: []
        }
    });
    */
}).then(function () {
    // create journal entry we have access to
    return Q.nbind(patient.createJournalEntry, patient)({
        date: (new Date()).toISOString(),
        text: "example journal entry",
        medication_ids: [medication._id]
    });
}).then(function() {
    // create dose event where med was taken
    return Q.nbind(patient.createDose, patient)({
        medication_id: medication._id,
        date: (new Date("2015-07-10")).toISOString(),
        taken: true,
        scheduled: 0
    });
}).then(function() {
    // create dose event where med was skipped
    return Q.nbind(patient.createDose, patient)({
        medication_id: medication._id,
        date: (new Date("2015-07-09")).toISOString(),
        taken: false,
        scheduled: 0
    });
}).then(function () {
    console.log("Test data generated");

    // get PDF dump and write to a temp file
    var deferred = Q.defer();
    request({
        url: util.format("http://localhost:5000/v1/patients/%d.pdf?start_date=2015-07-01&end_date=2015-07-31", patient._id),
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
