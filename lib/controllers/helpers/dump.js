"use strict";
var async = require("async"),
    util = require("util"),
    extend = require("xtend"),
    moment = require("moment-timezone"),
    journal = require("../journal.js"),
    doses = require("../doses.js"),
    doctors = require("../doctors.js"),
    pharmacies = require("../pharmacies.js"),
    medications = require("../medications.js"),
    events = require("../events.js"),
    requests = require("../requests.js"),
    crud = require("./crud.js"),
    shared = require("../patients/shared.js"),
    core = require("../patients/core.js"),
    errors = require("../../errors.js").ERRORS;

/*eslint-disable no-loop-func */

// calculate adherence stats (number taken, skipped, etc) from an array of match objects
var calculateAdherences = function (matches) {
    // for each match, calculate whether it's as_needed/taken/skipped/not recorded
    matches = matches.map(function (item) {
        if (typeof item.scheduled === "undefined") item.outcome = "as_needed";
        else if (item.took_medication === true) item.outcome = "taken";
        else if (typeof item.dose_id !== "undefined") item.outcome = "skipped";
        else item.outcome = "not_recorded";

        return item;
    });

    // calculate the various adherence totals
    var doses = matches.filter(function (item) {
        return item.outcome === "as_needed" || item.outcome === "taken";
    }).length;
    var events = matches.filter(function (item) {
        return item.outcome === "taken" || item.outcome === "skipped" || item.outcome === "not_recorded";
    }).length;
    var taken = matches.filter(function (item) {
        return item.outcome === "taken";
    }).length;
    var skipped = matches.filter(function (item) {
        return item.outcome === "skipped";
    }).length;
    var notRecorded = matches.filter(function (item) {
        return item.outcome === "not_recorded";
    }).length;
    var total = matches.length;

    return {
        taken: taken,
        takenPercentage: Math.round(taken / total * 1000) / 10,
        skipped: skipped,
        skippedPercentage: Math.round(skipped / total * 1000) / 10,
        notRecorded: notRecorded,
        notRecordedPercentage: Math.round(notRecorded / total * 1000) / 10,
        doses: doses,
        events: events,
        total: total
    };
};

var getStartDate = function (patient) {

    var doses = patient.doses;
    var minDate = null;
    var tempDate;
    //get the date of the earliest dose
    if (doses !== undefined && doses.length > 0) {
        for (var j = 0; j < doses.length; j++) {
            console.log(doses[j].date.utc);
            tempDate = moment(doses[j].date.utc);

            if (tempDate.isValid() && minDate === null || minDate.isAfter(tempDate))
                minDate = tempDate.startOf("day");
        }
    }
    return minDate;

};

// generate full data dump
module.exports = function (patient, user, startRaw, endRaw, next) {
    // patient timezone
    var tz = patient.tz;
    if (typeof tz !== "string" || tz.length === 0) tz = "Etc/UTC";

    var minDate = getStartDate(patient, tz);

    // validate start and end dates
    var start, end;
    var startPresent = (typeof startRaw === "string" && startRaw.length > 0);
    var endPresent = (typeof endRaw === "string" && endRaw.length > 0);
    if (!startPresent && !endPresent) {
        // if a start and an end date weren't set, default to the start and end of this month
        start = moment.tz(tz).startOf("month");
        end = moment.tz(tz).endOf("month");
    } else if (startPresent && !endPresent) {
        // if a start date was specified but no end date, validate the start date and set the end
        // date to the end of the month the start date is in
        start = moment.tz(startRaw, "YYYY-MM-DD", tz);
        if (!start.isValid()) return next(errors.INVALID_START_DATE);
        end = moment(start).endOf("month");
    } else if (!startPresent && endPresent) {
        // do a similar thing if the start date is not present but the end date is
        end = moment.tz(endRaw, "YYYY-MM-DD", tz);
        if (!end.isValid()) return next(errors.INVALID_END_DATE);
        start = moment(end).startOf("month");
    } else {
        // otherwise if both and start date are present, validate and use them
        start = moment.tz(startRaw, "YYYY-MM-DD", tz);
        end = moment.tz(endRaw, "YYYY-MM-DD", tz);
        if (!start.isValid()) return next(errors.INVALID_START_DATE);
        if (!end.isValid()) return next(errors.INVALID_END_DATE);
    }
    //if the date of the first log entry is after the proposed start date
    //replace the start date with the date of the first dosage
    if (minDate !== null && start.isBefore(minDate) && minDate.isBefore(end))
        start = minDate;

    // whatever was passed in, check that the start date is now before or equal to the end date
    if (start.isAfter(end)) return next(errors.INVALID_END_DATE);

    // functions to add each type of patient data
    // add basic/broad patient information
    var addPatient = function (data, callback) {
        data.patient = crud.filter(patient, core.keys);
        data.patient.name = util.format("%s %s", patient.firstName, patient.lastName);
        data.habits = patient.habits;
        data.patient.id = patient._id;
        return callback(null, data);
    };

    // add user information
    var addUser = function (data, callback) {
        data.user = {
            email: user.email,
            first_name: user.firstName,
            last_name: user.lastName,
            phone: user.phone
        };
        return callback(null, data);
    };

    var addTime = function (data, callback) {
        // add time range information
        data.start = start.format("YYYY-MM-DD");
        data.end = end.format("YYYY-MM-DD");
        data.time_range = util.format("%s - %s", start.format("MM/DD/YY"), end.format("MM/DD/YY"));
        return callback(null, data);
    };

    // add list of patient's journal entries, showing only those for which the user
    // has read access to all reference medications
    var addEntries = function (data, callback) {
        data.entries = patient.entries.filter(function (entry) {
            return entry.medicationIds.every(function (medId) {
                var med = patient.medications.id(medId);
                return med.authorize("read", user, patient) === null;
            });
        }).map(function (entry) {
            var output = crud.filter(entry.getData(patient), journal.keys);
            output.id = entry._id;
            return output;
        });
        return callback(null, data);
    };

    // add list of patient's doctors
    var addDoctors = function (data, callback) {
        data.doctors = patient.doctors.map(function (doctor) {
            var output = crud.filter(doctor.getData(patient), doctors.keys);
            output.id = doctor._id;
            return output;
        });
        return callback(null, data);
    };

    // add list of patient's pharmacies
    var addPharmacies = function (data, callback) {
        data.pharmacies = patient.pharmacies.map(function (pharmacy) {
            var output = crud.filter(pharmacy.getData(patient), pharmacies.keys);
            output.id = pharmacy._id;
            return output;
        });
        return callback(null, data);
    };

    // add list of patient's medications, showing only those for which the user has
    // access
    var addMedications = function (data, callback) {
        async.map(patient.medications.filter(function (medication) {
            return medication.authorize("read", user, patient) === null;
        }), function (medication, cb) {
            // basic data output
            var output = crud.filter(medication.getData(patient), medications.keys);
            output.id = medication._id;

            // add extra calculated fields
            output.summary = medication.toSummary(" - ");
            // generate schedule summary for report output (more comprehensive than the default
            // schedule_summary key)
            output.schedule_summary = medication.schedule.toSummary(tz, start, end).join(" & ");

            // call schedule matcher to find adherence stats
            patient.generateSchedule(start.format("YYYY-MM-DD"), end.format("YYYY-MM-DD"), user, medication._id,
                user._id, function (err, matches) {
                    if (err) return cb(err);

                    // add details for each 'time'
                    output.times = null;
                    if (medication.schedule.regularly) {
                        var times = medication.schedule.times;
                        for (var i = 0; i < times.length; i++) {
                            var time = extend(times[i], {});
                            // heading and description
                            time.heading = output.schedule.times[i].heading;
                            time.description = output.schedule.times[i].description;

                            // convert hh:mm a times from UTC (stored internally) to local time (API facing)
                            if (time.type === "exact") {
                                time.time = moment.utc(time.time, "hh:mm a").tz(tz).format("hh:mm a");
                            }

                            // generate adherence totals
                            // find the relevant match objects (those for this specific scheduled time)
                            var eventMatches = matches.schedule.filter(function (m) {
                                return m.scheduled === time._id;
                            });
                            // calculate stats
                            time.statistics = calculateAdherences(eventMatches);

                            // remove _id keys (we have id keys present already) on schedule times
                            // delete time._id;

                            times[i] = time;
                        }
                        output.schedule.times = times;
                    }

                    // add overall adherence stats
                    if (matches.schedule.length > 0) {
                        // ignoring as-needed/extra doses here
                        var regularDoses = matches.schedule.filter(function (m) {
                            return (typeof m.scheduled !== "undefined");
                        });
                        output.statistics = calculateAdherences(regularDoses);
                    } else {
                        output.statistics = null;
                    }

                    // add number of 'as needed' doses taken, to be used with just a differing label if
                    // medication is not marked as as needed
                    output.extra_doses = matches.schedule.filter(function (m) {
                        return (typeof m.scheduled === "undefined");
                    }).length;

                    return cb(null, output);
                });
        }, function (err, medications) {
            if (err) return callback(err);
            data.medications = medications;
            return callback(null, data);
        });
    };

    // add a 'log' of the patients' schedule
    var addSchedule = function (data, callback) {
        // get all schedule match events in the time range
        patient.generateSchedule(start.format("YYYY-MM-DD"), end.format("YYYY-MM-DD"), user, null, user._id,
            function (err, matches) {
                if (err) return callback(err);

                data.schedule = [];

                // iterate over each day in range
                for (var date = moment(start); !end.isBefore(date); date.add(1, "day")) {
                    var day = {};
                    day.date = date.tz(tz).format("YYYY-MM-DD");
                    day.title = date.tz(tz).format("dddd M/D/YY");

                    // find schedule match events for this day
                    var dayMatches = matches.schedule.map(function (item) {
                        item.date = moment.tz(item.date, tz);
                        return item;
                    }).filter(function (m) {
                        return (date.date() === m.date.date() &&
                            date.month() === m.date.month() &&
                            date.year() === m.date.year());
                    });

                    // calculate and display overall adherence stats
                    day.statistics = calculateAdherences(dayMatches);

                    // details for each event on that day
                    day.events = dayMatches.map(function (item) {
                        var result = {};

                        // moment.tz.zone(tz) gives us the timezone abbreviation (e.g., EST)
                        // var timezone = moment.tz.zone(tz).abbr(item.date.unix());
                        // either 9:45 or 9
                        if (item.date.minutes() === 0) result.title = item.date.format("ha");
                        else result.title = item.date.format("h:mma");
                        result.time = item.date.format("hh:mm a");

                        // find medication
                        var medication = patient.medications.id(item.medication_id);
                        result.medication_label = medication.toSummary(" ");
                        // don't 0-index
                        if (typeof item.scheduled !== "undefined")
                            result.medication_label += util.format(" (Event %d)", item.scheduled + 1);

                        // outcome
                        result.outcome = item.outcome;
                        if (item.outcome === "as_needed") result.outcome = "taken";
                        else if (item.outcome === "not_recorded") result.outcome = "not recorded";

                        // find dose and use notes field from that
                        result.note = "";
                        if (typeof item.dose_id !== "undefined") {
                            result.note = "no note";
                            var dose = patient.doses.id(item.dose_id);
                            if (typeof dose.notes !== "undefined" && dose.notes !== null && dose.notes.length > 0)
                                result.note = dose.notes;
                            result.note = util.format(" (%s)", result.note);
                        }

                        return result;
                    });

                    data.schedule.push(day);
                }

                callback(null, data);
            });
    };

    // add list of patient's doses
    var addDoses = function (data, callback) {
        data.doses = patient.doses.filter(function (dose) {
            var med = patient.medications.id(dose.medicationId);
            return med.authorize("read", user, patient) === null;
        }).map(function (dose) {
            var output = crud.filter(dose.getData(patient), doses.keys);
            output.id = dose._id;
            return output;
        });
        return callback(null, data);
    };

    // add list of patient's events
    var addEvents = function (data, callback) {
        data.events = patient.events.map(function (event) {
            var output = crud.filter(event.getData(patient), events.keys);
            output.id = event._id;
            return output;
        });
        return callback(null, data);
    };

    // add list of patient's shares
    var addShares = function (data, callback) {
        async.map(patient.shares, function (share, cb) {
            // format for API output
            share.format(function (err, output) {
                if (err) return cb(err);

                // filter keys and add ID
                output = crud.filter(output, shared.keys);
                output.id = share._id;
                return cb(null, output);
            });
        }, function (err, shares) {
            if (err) return callback(err);

            data.shares = shares;
            return callback(null, data);
        });
    };

    // add list of patient's requests made to/from
    var addRequested = function (data, callback) {
        data.requested = user.requested.map(function (r) {
            var output = crud.filter(r, requests.keys);
            output.id = r._id;
            return output;
        });
        return callback(null, data);
    };
    var addRequests = function (data, callback) {
        data.requests = user.requests.map(function (r) {
            var output = crud.filter(r, requests.keys);
            output.id = r._id;
            return output;
        });
        return callback(null, data);
    };

    async.seq(addPatient, addUser, addTime, addEntries, addDoctors, addPharmacies, addMedications, addSchedule,
        addDoses, addShares, addRequested, addRequests, addEvents)({}, next);
};
/*eslint-enable no-loop-func */
