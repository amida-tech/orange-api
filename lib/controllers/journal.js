"use strict";

var express         = require("express"),
    async           = require("async"),
    mongoose        = require("mongoose"),
    crud            = require("./helpers/crud.js"),
    list            = require("./helpers/list.js"),
    errors          = require("../errors.js").ERRORS,
    medications     = require("./medications.js"),
    auth            = require("./helpers/auth.js"),
    winstonInstance = require("../../config/winston.js");

const guard = auth.roleGuard;

var journal = module.exports = express.Router({ mergeParams: true });

// Helpers to DRY up CRUD controllers: see helpers/crud.js
// Fields we want to output in JSON responses (in addition to ID)
var inputKeys = ["date", "text", "medication_ids", "medications", "mood", "moodSeverity", "moodEmoji", "meditation",
                "meditationLength", "meditationDifficulty", "meditationTaken", "meditationRequestedAssistance", "creator", "sideEffect", "sideEffectSeverity", "activity", "activityMinutes"];
var keys = module.exports.keys = inputKeys.concat(["hashtags", "role"]);
var filterInput = crud.filterInputGenerator(inputKeys),
    formatObjectCode = crud.formatObjectGenerator(keys),
    formatObject = formatObjectCode(200),
    formatList = crud.formatListGenerator(keys, "entries"),
    returnData = crud.returnData,
    returnListData = crud.returnListData;

// Usually we just return medication_ids, but when viewing a specific
// journal entry we expand this out to medications
function populateEntry (req, res, next) {
    res.data.expand(req.patient);

    // format medications for output
    res.data.medications = res.data.medications.map(function (medication) {
        var output = crud.filter(medication.getData(req.patient), medications.keys);
        output.id = medication._id;
        return output;
    });

    next();
}

// authorize the user against the patient, and then against *all* medications specified
// in medications_id
// additionally, only allow clinicians to access clinician notes
function authorize(access) {
    return function (req, res, next) {
        // first authorize read access against the patient
        auth.authorize(access)(req, res, function (err) {
            if (err) return next(err);

            // find journal entry from ID
            // TODO: we're making duplicate find calls for every dose endpoint
            req.patient.findJournalEntryById(req.params.journalentry, function (err, entry) {
                if (err) return next(err);

                if (entry.role === "clinician" && req.user.role !== "clinician") return next(errors.UNAUTHORIZED);

                // authorize against all medication given by medicationid
                // this isn't as slow as it looks: findMedicationById is asynchronous but could
                // just as easily by synchronous
                async.each(entry.medicationIds, function (medId, callback) {
                    req.patient.findMedicationById(medId, function (err, medication) {
                        if (err) return callback(err);
                        callback(medication.authorize(access, req.user, req.patient));
                    });
                }, next);
            });
        });
    };
}

// do the same as the above, but use the medication ID POSTed rather than the one stored
// in the dose given by the doseid in the URL
function authorizeFromData(access) {
    return function (req, res, next) {
        // if medication IDs not specified, then authorize
        if (typeof req.data.medication_ids === "undefined" || req.data.medication_ids === null)
            return next();

        // authorize against all medication given by medicationid
        // this isn't as slow as it looks: findMedicationById is asynchronous but could
        // just as easily by synchronous
        async.each(req.data.medication_ids, function (medId, callback) {
            req.patient.findMedicationById(medId, function (err, medication) {
                // findMedicationById throws 404s but we want 400s
                if (err) {
                    if (err === errors.INVALID_MEDICATION_ID) return callback(errors.INVALID_RESOURCE_MEDICATION_ID);
                    return callback(err);
                }

                // medication_id might not correspond to a medication
                if (!medication) return callback(errors.INVALID_RESOURCE_MEDICATION_ID);

                callback(medication.authorize(access, req.user, req.patient));
            });
        }, next);
    };
}

// set whether the user is a clinician or not in the log data
// help desk roles are treated as clinicians for the purpose of notes
function setRole(req, res, next) {
    req.data.role = req.user.role;
    if (req.data.role === "helpDesk") {
      req.data.role = "clinician";
    }
    return next();
}

function notesMoodsSideEffects (req, res, next) {
    var results = [];
    if (req.route.path === "/notes") {
        results = req.patient.entries.filter(function (entry) {
            return !!entry.text;
        });
    } else if (req.route.path === "/side-effects") {
        results = req.patient.entries.filter(function (entry) {
            return !!entry.sideEffect;
        });
    } else if (req.route.path === "/moods") {
        results = req.patient.entries.filter(function (entry) {
            return !!entry.mood;
        });
    }
    res.status(200).send({
        count: results.length,
        success: true,
        entries: results
    });
}

journal.get("/notes", guard(["admin", "programAdministrator", "clinician", "helpDesk"]), auth.authorize("read"), notesMoodsSideEffects);
journal.get("/moods", guard(["admin", "programAdministrator", "clinician", "user", "helpDesk"]), auth.authorize("read"), notesMoodsSideEffects);
journal.get("/side-effects", guard(["admin", "programAdministrator", "clinician", "user", "helpDesk"]), auth.authorize("read"), notesMoodsSideEffects);

const patientUserAndFreeTextNote = (req) => req.authClaims.scopes.every((scope) => scope === "user") && req.data && req.data.text;

//Helper function to redirect to special helpDesk based rotues with special auth
function redirectIfHelpDesk(localUrl) {
    return function (req, res, next) {
      if(req.user.role === "helpDesk") {
        return res.redirect(307, localUrl);
      } else {
        return next();
      }
    };
}

// Helper function to clean up data to make sure only notes can be posted
// see JournalEntrySchema.methods.setData for where this takes effect
function helpDeskDataFilter() {
  return function (req, res, next) {
    var { creator, user, text, date } = req.data;
    req.data = { creator, user, text, date }
    return next();
  };
}

// Create a new journal entry for the specified patient (requires write access)
journal.post("/", redirectIfHelpDesk("journal/helpDeskNote"), guard(["admin", "programAdministrator", "clinician", "user"]),
    auth.authorize("write"), filterInput, authorizeFromData("write"), setRole,
function (req, res, next) {
    if (patientUserAndFreeTextNote(req)) {
        return next(errors.UNAUTHORIZED);
    }
    req.patient.createJournalEntry(Object.assign({}, req.data, { user: req.user }), returnData(res, next));
}, formatObjectCode(201)); // return 201 status code

//TODO Guard for helpdesk
//Help desk posts to journals are filtered out to only allow text based entries aka Notes
//This way we do not have to give the help desk role write permissions
journal.post("/helpDeskNote", guard(["helpDesk"]), auth.authorize("read"), filterInput, helpDeskDataFilter(), authorizeFromData("read"), setRole, function (req, res, next) {
    req.patient.createJournalEntry(Object.assign({}, req.data, { user: req.user }), returnData(res, next));
}, formatObjectCode(201)); // return 201 status code

// View a single journal entry for the specified patient
journal.get("/:journalentry", guard(["admin", "programAdministrator", "clinician", "user", "helpDesk"]), authorize("read"), function (req, res, next) {
    req.patient.findJournalEntryById(req.params.journalentry, returnData(res, next));
}, populateEntry, formatObject);

// Remove a single journal entry for the specified patient (requires write access)
journal.delete("/:journalentry", guard(["admin", "programAdministrator", "clinician", "user"]), authorize("write"), function (req, res, next) {
    req.patient.findJournalEntryByIdAndDelete(req.params.journalentry, returnData(res, next));
}, formatObject);

// Update a single journal entry for the specified patient (requires write access)
journal.put("/:journalentry", guard(["admin", "programAdministrator", "clinician", "user"]),
    authorize("write"), filterInput, authorizeFromData("write"), setRole,
function (req, res, next) {
    if (patientUserAndFreeTextNote(req)) {
        return next(errors.UNAUTHORIZED);
    }
    req.patient.findJournalEntryByIdAndUpdate(req.params.journalentry, req.data, returnData(res, next));
}, formatObject);

// View a listing of the whole journal for the specified patient
var paramParser = list.parseListParameters(["id", "date"], ["start_date", "end_date", "medication_ids", "text", "includeSkippedMeditations"]);
journal.get("/", guard(["admin", "programAdministrator", "clinician", "user", "helpDesk"]), auth.authorize("read"), paramParser, list.parseDateFilters, function (req, res, next) {
    // parse and validate the medication ids to filter by
    var medicationIds = req.listParameters.filters.medication_ids;
    if (typeof medicationIds === "undefined" || medicationIds === null) medicationIds = [];
    if (typeof medicationIds === "string") medicationIds = [medicationIds];
    if (typeof medicationIds !== "object" || medicationIds.constructor !== Array)
        return next(errors.INVALID_RESOURCE_MEDICATION_ID);
    for (var i = 0; i < medicationIds.length; i++) {
        // convert from string to int
        var rawId = medicationIds[i];
        var medId = ~~Number(rawId); // ~~ truncates fractional parts

        // check ID was a valid number
        if (String(medId) !== rawId || medId < 0)
            return next(errors.INVALID_RESOURCE_MEDICATION_ID);

        // check med with that ID exists
        var med = req.patient.medications.id(medId);
        if (!med) return next(errors.INVALID_RESOURCE_MEDICATION_ID);

        // valid ID
        medicationIds[i] = medId;
    }
    req.listParameters.filters.medication_ids = medicationIds;

    // default to not including skipped Meditations
    var includeSkippedMeditations = req.listParameters.filters.includeSkippedMeditations === 'true';
    req.listParameters.filters.includeSkippedMeditations = includeSkippedMeditations;

    next();
}, function (req, res, next) {
    // patients cannot view free text notes
    const filters = Object.assign({}, req.listParameters.filters, {
        textAllowed: req.authClaims.scopes.some((scope) => scope !== "user")
    });
    const params = Object.assign({}, req.listParameters, { filters });
    req.patient.queryJournalEntries(params, req.user, req.patient, returnListData(res, next));
}, formatList);
