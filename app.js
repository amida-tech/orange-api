"use strict";
// Web
var express = require("express");
var app = module.exports = express();

// Database setup in run.js

// CORS
app.use(function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Credentials", true);
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELTE");
    next();
});

// Prevent caching
app.disable("etag");

// Parse body params from JSON unless we're viewing an avatar
var bodyParser = require("body-parser");
var jsonParser = bodyParser.json();
app.use(function (req, res, next) {
    // we can't access req.route in here as no route has been matched so instead
    // we have to do string magic with req.path
    // no user defined URLs (params already stripped off) so this is safe
    // Content-Type headers may not be accurate hence the URL matching
    if (req.path.indexOf("avatar") >= 0) return next();

    // otherwise delegate to body-parser to parse the JSON body
    return jsonParser(req, res, next);
});

// All models: in all other files, just used mongoose.model(NAME)
// rather than requiring these directly to avoid circular dependencies
// Models that are purely nested resources under patient are required
// in patient.js, so don't require them again here
require("./lib/models/counter.js"); // Require first
require("./lib/models/user/user.js");
// Patient requires a getter function for a gridfs client (set as an express
// setting in run.js but may not be immediately accessible hence the getter function)
require("./lib/models/patient/patient.js")(function () {
    return app.settings.gridfs;
});

// App-level router containing all routes
var router = express.Router();

// Authentication tokens
router.use("/auth", require("./lib/controllers/auth.js"));

// User registration/signup
router.use("/user", require("./lib/controllers/users.js"));

// Patient CRUD and sharing
router.use("/patients", require("./lib/controllers/patients.js"));

// Routes for a specific patient
// mergeParams lets us access patient ID from these controllers
var patientRouter = express.Router({ mergeParams: true });
var auth = require("./lib/controllers/helpers/auth.js");
patientRouter.use(auth.authenticate); // find user from access token

patientRouter.use("/habits", require("./lib/controllers/habits.js"));
patientRouter.use("/doctors", require("./lib/controllers/doctors.js"));
patientRouter.use("/pharmacies", require("./lib/controllers/pharmacies.js"));
patientRouter.use("/medications", require("./lib/controllers/medications.js"));
patientRouter.use("/journal", require("./lib/controllers/journal.js"));
patientRouter.use("/doses", require("./lib/controllers/doses.js"));
// scheduleController requires a getter function for the zerorpc client, set
// as an express 'setting' in run.js
var scheduleController = require("./lib/controllers/schedule.js")(function () {
    return app.settings.zerorpc;
});
patientRouter.use("/schedule", scheduleController);

// nest patient-specific resources under /patients/:id
router.use("/patients/:patientid", patientRouter);

// Mount everything under versioned endpoint
app.use("/v1", router);

// Error handling middleware
app.use(require("./lib/error_handler.js"));
