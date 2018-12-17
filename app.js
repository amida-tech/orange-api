"use strict";
// Web
const express = require("express");
const cors = require("cors");
const winstonInstance = require("./config/winston");
const expressWinston = require("express-winston");
const app = module.exports = express();

// disable nagle's algorithm: significantly slows down piping to res, as is
// done in GET /avatar
app.use(function(req, res, next){
    req.connection.setNoDelay(true);
    next();
});

// Logging
var config = require("./config.js");



// Database setup in run.js

// All models: in all other files, just used mongoose.model(NAME)
// rather than requiring these directly to avoid circular dependencies
// Models that are purely nested resources under patient are required
// in patient.js, so don't require them again here
require("./lib/models/counter.js"); // Require first
require("./lib/models/rxnorm.js");
require("./lib/models/formulary_entry.js");
// Patient and User require a getter function for a gridfs client (set as an express
// setting in run.js but may not be immediately accessible hence the getter function)
function getGfs() {
    return app.settings.gridfs;
}
require("./lib/models/user/user.js")(getGfs);
require("./lib/models/patient/patient.js")(getGfs);
require("./lib/models/reminder_notification");
require("./scheduleMedicationReminders.js");


// CORS
const corsDomains = config.accessControlAllowOrigin.split(",").map(function (domain) {
  return domain.trim();
});

app.use(cors({
  origin: function (origin, callback) {
    // TODO: Figure out why origin is coming through as undefined, which seems to be
    // happening because this is running inside a docker container, fix the problem,
    // and remove the `origin === undefined` clause.
    if (corsDomains.indexOf(origin) !== -1 || corsDomains.indexOf("*") !== -1 || config.accessControlAllowOrigin === "*" || origin === undefined) {
      // Cors passes!
      callback(null, true);
    } else {
      console.warn(`WARNING: cors failed. Make sure you have your ACCESS_CONTROL_ALLOW_ORIGIN environment variable set correctly. For this request, origin was: ${origin}`);
      // This will make it so that no Access-Control-... headers are returned on
      // the OPTIONS request, and requests from domains not in the list will fail.
      // Also, requests from mobile apps and REST tools hit this case, but they still work.
      callback(null, false);
    }
  },
  credentials: true,
  allowedHeaders: "Origin, X-Requested-With, Content-Type, Accept, Authorization, X-Client-Secret",
  methods: "GET, POST, PUT, DELETE, OPTIONS"
}));

// Prevent caching
app.disable("etag");

// Parse body params from JSON unless we're viewing an avatar
var bodyParser = require("body-parser");

var jsonParser = bodyParser.json({
    limit: "5mb"
});

app.use(function (req, res, next) {
    // we can't access req.route in here as no route has been matched so instead
    // we have to do string magic with req.path
    // no user defined URLs (params already stripped off) so this is safe
    // Content-Type headers may not be accurate hence the URL matching
    if (req.path.indexOf("avatar") >= 0) return next();

    // otherwise delegate to body-parser to parse the JSON body
    return jsonParser(req, res, next);
});

const passportAuth = require("./lib/controllers/helpers/passport.js")();
app.use(passportAuth.initialize());

// every API request needs to have a client secret posted. this is a fixed hexstring
// that's just read from config.js and directly compared.
// there are obvious security issues with this approach, but in the context of
// this app (particularly considering the frontend has no encrypted local storage to
// store the client secret in regardless) it makes sense
var errors = require("./lib/errors.js").ERRORS;
app.use(function (req, res, next) {
    // don't authenticate OPTIONS requests for browser compatibility
    if (req.method === "OPTIONS") return next();

    // don't authenticate health checks
    if (req.path.indexOf("/health") >= 0) return next();
    if (req.path.indexOf("/facebook") >= 0) return next();

    // unauthorized
    if (req.headers["x-client-secret"] !== config.secret) return next(errors.INVALID_CLIENT_SECRET);

    next();
});


// enable detailed API logging without logging JWT
if (config.logLevel === "debug") {
    expressWinston.requestWhitelist.push("body");
    expressWinston.responseWhitelist.push("body");
} else {
    expressWinston.requestWhitelist = ["url", "method", "httpVersion", "originalUrl", "query"];
    expressWinston.responseWhitelist = ["statusCode", "responseTime"];
}
app.use(expressWinston.logger({
    winstonInstance,
    meta: true, // optional: log meta data about request (defaults to true)
    msg: "HTTP {{req.method}} {{req.url}} {{res.statusCode}} {{res.responseTime}}ms",
    colorStatus: true // Color the status code (default green, 3XX cyan, 4XX yellow, 5XX red).
}));


// App-level router containing all routes
var router = express.Router();

// Health check endpoint
router.get("/health", function (req, res) {
    res.status(200);
    res.send({ success: true });
});

// User registration/signup
router.use("/user", require("./lib/controllers/users.js"));

// External APIs
router.use("/npi", require("./lib/controllers/npi.js"));
router.use("/rxnorm", require("./lib/controllers/rxnorm.js"));

router.use("/formulary", require("./lib/controllers/formulary_entries.js"));

// User sharing
router.use("/", require("./lib/controllers/requests.js"));

// Medications and schedule for all patients the user has access to
// provides /medications & /schedule
router.use("/", require("./lib/controllers/all_medications.js"));

// Patient CRUD and sharing
router.use("/patients", require("./lib/controllers/patients/patients.js"));

// Routes for a specific patient
// mergeParams lets us access patient ID from these controllers
var patientRouter = express.Router({ mergeParams: true });
var auth = require("./lib/controllers/helpers/auth.js");
patientRouter.use(auth.authenticate); // find user from access token

patientRouter.use("/habits", require("./lib/controllers/habits.js"));
patientRouter.use("/emergencyContacts", require("./lib/controllers/emergency_contacts.js"));
patientRouter.use("/documentSignatures", require("./lib/controllers/document_signatures.js"));
patientRouter.use("/medications", require("./lib/controllers/medications.js"));
patientRouter.use("/journal", require("./lib/controllers/journal.js"));
patientRouter.use("/doses", require("./lib/controllers/doses.js"));
patientRouter.use("/schedule", require("./lib/controllers/schedule.js"));
patientRouter.use("/doctors", require("./lib/controllers/doctors.js"));
patientRouter.use("/pharmacies", require("./lib/controllers/pharmacies.js"));
patientRouter.use("/events", require("./lib/controllers/events.js"));

// nest patient-specific resources under /patients/:id
router.use("/patients/:patientid", patientRouter);

// Mount everything under versioned endpoint
app.use("/v1", router);

// Error handling middleware
app.use(require("./lib/error_handler.js"));
