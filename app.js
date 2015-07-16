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

// every API request needs to have a client secret posted. this is a fixed hexstring
// that's just read from .secret and directly compared (already stored in app.settings.secret
// by run.js). there are obvious security issues with this approach, but in the context of
// this app (particularly considering the frontend has no encrypted local storage to
// store the client secret in regardless) it makes sense
var errors = require("./lib/errors.js").ERRORS;
app.use(function (req, res, next) {
    // unauthorized
    if (req.headers["x-client-secret"] !== app.settings.secret) return next(errors.INVALID_CLIENT_SECRET);

    next();
});

// All models: in all other files, just used mongoose.model(NAME)
// rather than requiring these directly to avoid circular dependencies
// Models that are purely nested resources under patient are required
// in patient.js, so don't require them again here
require("./lib/models/counter.js"); // Require first
require("./lib/models/user/user.js");
// Patient requires a getter function for a gridfs client (set as an express
// setting in run.js but may not be immediately accessible hence the getter function)
// and likewise for a zerorpc client
require("./lib/models/patient/patient.js")(function () {
    return app.settings.gridfs;
}, function () {
    return app.settings.zerorpc;
});

// App-level router containing all routes
var router = express.Router();

// Authentication tokens
router.use("/auth", require("./lib/controllers/auth.js"));

// User registration/signup
router.use("/user", require("./lib/controllers/users.js"));

// External APIs
router.use("/npi", require("./lib/controllers/npi.js"));
router.use("/rxnorm", require("./lib/controllers/rxnorm.js"));

// User sharing
router.use("/", require("./lib/controllers/requests.js"));

// Patient CRUD and sharing
router.use("/patients", require("./lib/controllers/patients/patients.js"));

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
patientRouter.use("/schedule", require("./lib/controllers/schedule.js"));

// nest patient-specific resources under /patients/:id
router.use("/patients/:patientid", patientRouter);

// Mount everything under versioned endpoint
app.use("/v1", router);

// Error handling middleware
app.use(require("./lib/error_handler.js"));
