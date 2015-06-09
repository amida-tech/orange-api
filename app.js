"use strict";
// Web
var express = require("express");
var app = module.exports = express();

// Setup database in run.js

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

// Parse body params from JSON
var bodyParser = require("body-parser");
app.use(bodyParser.json());

// All models: in all other files, just used mongoose.model(NAME)
// rather than requiring these directly
require("./lib/models/counter.js"); // Require first
require("./lib/models/user.js");
require("./lib/models/patient/patient.js");

// App-level router containing all routes
/*eslint-disable new-cap */
var router = express.Router();
/*eslint-enable new-cap */

// Authentication tokens
var auth = require("./lib/controllers/auth.js");
router.use("/auth", auth);

// User registration/signup
router.use("/user", require("./lib/controllers/users.js"));

// Patient CRUD and sharing
router.use("/patients", require("./lib/controllers/patients.js"));

// Routes for a specific patient
// mergeParams lets us access patient ID from these controllers
var patientRouter = express.Router({ mergeParams: true });
patientRouter.use(auth.authenticate);
patientRouter.use(require("./lib/controllers/helpers/patient_auth.js"));

patientRouter.use("/habits", require("./lib/controllers/habits.js"));
patientRouter.use("/doctors", require("./lib/controllers/doctors.js"));
patientRouter.use("/pharmacies", require("./lib/controllers/pharmacies.js"));
patientRouter.use("/medications", require("./lib/controllers/medications.js"));

// nest patient-specific resources under /patients/:id
router.use("/patients/:patientid", patientRouter);

// Mount everything under versioned endpoint
app.use("/v1", router);

// Error handling middleware
app.use(require("./lib/error_handler.js"));
