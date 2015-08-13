"use strict";
var express         = require("express"),
    curry           = require("curry"),
    async           = require("async"),
    pdfmake         = require("pdfmake"),
    moment          = require("moment-timezone"),
    util            = require("util"),
    // see pdfmake examples/ in repo
    PdfPrinter      = require("../../../node_modules/pdfmake/src/printer"),
    auth            = require("../helpers/auth.js"),
    generateDump    = require("../helpers/dump.js"),
    errors          = require("../../errors.js").ERRORS;

// place fonts into top-level fonts/ directory
var pdfFonts = {
	Lato: {
        normal: "fonts/Lato-Regular.ttf",
		bold: "fonts/Lato-Black.ttf",
		italics: "fonts/Lato-Italic.ttf",
		bolditalics: "fonts/Lato-BlackItalic.ttf"
	}
};

var report = module.exports = express.Router({ mergeParams: true });

// global layout settings
var rightMargin = 40;
var leftMargin = 40;
var bottomMargin = 40;
var pageWidth = 595;
var headerPadding = 5;

// create header containing various patient metadata and an orange logo
var setupHeader = function (patient, user, start, end, doc) {
    // config options for header
    var logoWidth = 403;
    var headerHeight = 108;

    // setup header
    doc.pageMargins = [leftMargin, headerHeight + 12, rightMargin, bottomMargin];
    doc.header = function (page, pages) {
        // borderless table with image on left and info on right
        var image = {
            image: "images/header.png",
            width: logoWidth,
            height: headerHeight,
            style: "header"
        };
        var info = {
            stack: [" "], // rudimentary padding
            style: ["header", "headerInfo"]
        };
        
        // add content to info a row at a time
        info.stack.push({
            text: [
                "LOG NAME: ",
                {
                    text: util.format("%s %s", patient.firstName, patient.lastName),
                    style: "headerBold"
                }
            ]
        });
        info.stack.push({
            text: [
                "TIME RANGE: ",
                {
                    text: util.format("%s - %s", start.format("MM/DD/YY"), end.format("MM/DD/YY")),
                    style: "headerBold"
                }
            ]
        });
        info.stack.push({
            text: [
                "USER: ",
                {
                    text: user.email,
                    style: "headerBold"
                }
            ]
        });
        info.stack.push({
            text: [
                "Page ",
                {
                    text: page.toString(),
                    style: "headerBold"
                },
                " of ",
                {
                    text: pages.toString(),
                    style: "headerBold" 
                }
            ]
        });
        
        var header = {
            margin: 0,
            layout: "noBorders",
            table: {
                headerRows: 0,
                widths: [headerPadding, logoWidth, "*", headerPadding],
                body: [[
                    {
                        // padding
                        style: "header",
                        text: ""
                    },
                    image,
                    info,
                    {
                        // padding
                        style: "header",
                        text: ""
                    }
                ]]
            }
        };
        return header;
    };

    // styling
    doc.styles.headerInfo = {
        alignment: "right",
        fontSize: 12
    };
    doc.styles.header = {
        fillColor: "#faa91d",
        color: "white"
    };
    doc.styles.headerBold = {
        bold: true
    };
};

// setup footer containing simple text
var setupFooter = function (doc) {
    doc.footer = {
        text: "Report generated using ORANGE medication log - orange.amida-tech.com",
        style: "footer"
    };
    doc.styles.footer = {
        alignment: "right",
        fontSize: 12,
        margin: [40, 0],
        bold: true
    };
    doc.defaultStyle = {
        font: "Lato"
    };
};

// document-wide styles
var setupStyles = function (doc) {
    doc.styles.sectionHeader = {
        fontSize: 10,
        color: "#999999",
        bold: true
    };
    doc.styles.detailsText = {
        fontSize: 12
    };
    doc.styles.detailsHeader = {
        bold: true,
        fontSize: 12
    }
    doc.styles.itemHeader = {
        fontSize: 15,
        bold: true
    };
};

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
        takenPercentage: Math.round(taken / total * 1000)/10,
        skipped: skipped,
        skippedPercentage: Math.round(skipped / total * 1000)/10,
        notRecorded: notRecorded,
        notRecordedPercentage: Math.round(notRecorded / total * 1000)/10,
        doses: doses,
        events: events,
        total: total
    };
};

// details for a single scheduled time for a single medication
var setupMedicationTime = function (time, index, tz, matches) {
    // Event n heading
    var heading = {
        text: util.format("Event %d", index + 1), // 0-indexed
        style: "detailsHeader"
    };

    // One dose at 9.50pm
    // One dose at breakfast/lunch/dinner
    // One dose before bed
    // One dose after waking
    // One dose any time
    var description = "One dose";
    if (time.type === "unspecified") {
        description += " any time";
    } else if (time.type === "exact") {
        var t = moment.tz(time.time, "HH:mm", tz);
        var timeFormatted;
        if (t.minutes() === 0) timeFormatted = t.format("ha");
        else timeFormatted = t.format("h:mma");
        description += util.format(" at %s", timeFormatted);
    } else if (time.type === "event") {
        // sleep is the special case
        if (time.event === "sleep") {
            if (time.when === "before") description += " before bed";
            else description += " after waking";
        } else {
            description += util.format(" at %s", time.event);
        }
    }
    description += ".";

    // generate adherence totals and put them into brackets
    // find the relevant match objects (those for this specific scheduled time)
    var eventMatches = matches.schedule.filter(function (m) {
        return m.scheduled === time._id;
    });
    // calculate stats
    var stats = calculateAdherences(eventMatches);
    // generate formatted string
    var adherence = util.format(
        "(Taken %d/%d, Skipped %d/%d, Not Recorded %d/%d)",
        stats.taken, stats.total,
        stats.skipped, stats.total,
        stats.notRecorded, stats.total
    );
    if (stats.total === 0) adherence = "(No scheduled doses this report)";

    return {
        text: [heading, " - ", description, " ", adherence]
    };
};

// overall adherence stats for a specific medication
var setupMedicationStats = function (matches, doc) {
    // overall adherence stats
    if (matches.schedule.length > 0) {
        doc.push(" "); // padding

        // ignoring as-needed/extra doses here
        var regularDoses = matches.schedule.filter(function (m) {
            return (typeof m.scheduled !== "undefined");
        });
        var stats = calculateAdherences(regularDoses);
        // output three totals rows
        doc.push({
            text: util.format("Events Taken: %d (%d%)", stats.taken, stats.takenPercentage),
            style: "detailsHeader"
        });
        doc.push({
            text: util.format("Events Skipped: %d (%d%)", stats.skipped, stats.skippedPercentage),
            style: "detailsHeader"
        });
        doc.push({
            text: util.format("Events Not Recorded: %d (%d%)", stats.notRecorded, stats.notRecordedPercentage),
            style: "detailsHeader"
        });
    }
};

// stats re as-needed and extra doses
var setupMedicationExtraDoses = function (medication, matches, doc) {
    // add number of 'as needed' doses taken, with just a differing label if
    // medication is not marked as as needed
    var extraDoses = matches.schedule.filter(function (m) {
        return (typeof m.scheduled === "undefined");
    }).length;
    if (medication.schedule.regularly && (extraDoses > 0 || medication.schedule.asNeeded)) {
        doc.push(" "); // padding
        doc.push({
            text: util.format("Extra Doses Taken: %d", extraDoses),
            style: "detailsHeader"
        });
    } else if (medication.schedule.asNeeded) {
        doc.push(" "); // padding
        doc.push({
            text: util.format("Doses Taken: %d", extraDoses),
            style: "detailsHeader"
        });
    }
};

// details for a single medication
var setupMedication = curry(function (patient, user, data, tz, start, end, medication, callback) {
    // subdocument for medication
    var doc = [];

    // generate title from brand and name, handling cases when they're unknown
    doc.push({
        text: medication.toSummary(" - "),
        style: "itemHeader"
    });

    // generate a short summary of the schedule
    doc.push({
        text: medication.schedule.toSummary(tz, start, end),
        style: "detailsText"
    });

    // taken with/without food
    if (medication.schedule.takeWithFood !== null) {
        var label;
        if (medication.schedule.takeWithFood) label = "Taken with food";
        else label = "Taken without food";
        doc.push({
            text: label,
            style: "detailsText"
        });
    }

    // call schedule matcher to find adherence stats
    patient.generateSchedule(start.format("YYYY-MM-DD"), end.format("YYYY-MM-DD"), user, medication._id, user._id, function (err, matches) {
        if (err) return callback(error);

        // add details for each 'time'
        if (medication.schedule.regularly) {
            doc.push(" "); // padding
            var times = medication.schedule.times;
            var timesDocs = [];
            for (var i = 0; i < times.length; i++) {
                timesDocs.push(setupMedicationTime(times[i], i, tz, matches));
            }
            doc.push({
                // ul: timesDocs // bullets
                stack: timesDocs // no bullets
            });
        }

        // add overall adherence stats
        setupMedicationStats(matches, doc);

        // add details of any as needed extra doses taken
        setupMedicationExtraDoses(medication, matches, doc);

        // horizontal line
        var linePadding = 15;
        var lineHeight = 1;
        doc.push({
            canvas: [
                {
                    type: "line",
                    x1: 0,
                    y1: linePadding,
                    x2: pageWidth - rightMargin - leftMargin,
                    y2: linePadding,
                    lineWidth: lineHeight
                },
                // padding below
                {
                    type: "line",
                    x1: 0,
                    y1: 2 * linePadding + lineHeight,
                    x2: pageWidth - rightMargin - leftMargin,
                    y2: 2 * linePadding + lineHeight,
                    lineWidth: 0,
                    color: "white"
                }
            ]
        });

        callback(null, doc);
    });

});

// add medications info
var setupMedications = curry(function (patient, user, data, tz, start, end, doc, callback) {
    // section header
    doc.content.push({
        text: "MEDICATIONS",
        style: "sectionHeader"
    });

    // output details for each of the user's medications
    async.map(data.medications, setupMedication(patient, user, data, tz, start, end), function (err, medDocs) {
        if (err) return callback(err);

        // append to document
        medDocs.forEach(function (medDoc) {
            doc.content.push({
                // put in a table so each medication is kept on the same page
                table: {
                    dontBreakRows: true,
                    body: [[
                        medDoc
                    ]]
                },
                layout: "noBorders"
            });
        });
        callback(null, doc);
    });
});

// create dosage log
var setupSchedule = curry(function (patient, user, tz, start, end, doc, callback) {
    // list of all schedule events
    doc.content.push({
        text: "DOSAGE LOGS",
        style: "sectionHeader",
        pageBreak: "before" // new page
    });

    // get all schedule match events in the time range
    patient.generateSchedule(start.format("YYYY-MM-DD"), end.format("YYYY-MM-DD"), user, null, user._id, function (err, matches) {
        if (err) return callback(error);

        // iterate over each day in range
        for (var date = moment(start); !end.isBefore(date); date.add(1, "day")) {
            doc.content.push({
                // put in a table so we each day is kept on the same page
                table: {
                    dontBreakRows: true,
                    body: [[
                        setupScheduleDay(date, matches, patient, tz, doc)
                    ]]
                },
                layout: "noBorders"
            });
        }

        callback(null, doc);
    });
});

// create one day item in the dosage log
var setupScheduleDay = function (date, matches, patient, tz, doc) {
    var doc = [];

    // day header
    doc.push({
        text: date.tz(tz).format("dddd M/D/YY"),
        style: "itemHeader"
    });

    // find schedule match events for this day
    matches = matches.schedule.map(function (item) {
        item.date = moment.tz(item.date, tz);
        return item;
    }).filter(function (item) {
        return (date.date() === item.date.date() && date.month() === item.date.month() && date.year() === item.date.year());
    });

    // calculate and display overall adherence stats
    var stats = calculateAdherences(matches);
    doc.push({
        text: util.format(
            "%d Doses, %d Events (%d Taken, %d Skipped, %d Not Recorded)",
            stats.doses,
            stats.events,
            stats.taken,
            stats.skipped,
            stats.notRecorded
        ),
        style: "detailsHeader"
    });

    // dislay details for each event on that day
    doc.push({
        ul: matches.map(setupScheduleItem(patient, tz))
    });

    // padding
    doc.push(" ");

    return doc;
};

var setupScheduleItem = curry(function (patient, tz, item) {
    // moment.tz.zone(tz) gives us the timezone abbreviation (e.g., EST)
    // var timezone = moment.tz.zone(tz).abbr(item.date.unix());
    // either 9:45 or 9
    var dateText;
    if (item.date.minutes() === 0) dateText = item.date.format("ha");
    else dateText = item.date.format("h:mma");

    // find medication
    var medication = patient.medications.id(item.medication_id);
    var medText = medication.toSummary(" ");
    // don't 0-index
    if (typeof item.scheduled !== "undefined") medText += util.format(" (Event %d)", item.scheduled+1);

    var outcomeText = item.outcome;
    if (item.outcome === "as_needed") outcomeText = "taken";
    else if (item.outcome === "not_recorded") outcomeText = "not recorded";
    var outcome = {
        text: outcomeText,
        style: "detailsHeader"
    };

    // find dose and use notes field from that
    var noteText = "";
    if (typeof item.dose_id !== "undefined") {
        noteText = "no note";
        var dose = patient.doses.id(item.dose_id);
        if (typeof dose.notes !== "undefined" && dose.notes !== null && dose.notes.length > 0)
            noteText = dose.notes;
        noteText = util.format(" (%s)", noteText);
    }

    return {
        text: [dateText, " - ", medText, " - ", outcome, noteText]
    };
});

// View PDF report of the patient's data
report.get("/", auth.authenticate, auth.authorize("read"), function (req, res, next) {
    // patient timezone
    var tz = req.patient.tz;
    if (typeof tz !== "string" || tz.length === 0) tz = "Etc/UTC";

    // validate start and end dates
    var startRaw = req.query.start_date, endRaw = req.query.end_date;
    if (typeof startRaw !== "string" || startRaw.length === 0) return next(errors.INVALID_START_DATE);
    if (typeof endRaw !== "string" || endRaw.length === 0) return next(errors.INVALID_END_DATE);
    var start = moment.tz(startRaw, "YYYY-MM-DD", tz);
    var end = moment.tz(endRaw, "YYYY-MM-DD", tz);
    if (!start.isValid()) return next(errors.INVALID_START_DATE);
    if (!end.isValid()) return next(errors.INVALID_END_DATE);
    if (start.isAfter(end)) return next(errors.INVALID_END_DATE);

    // generateDump handles access permissions for us to return a big flat js object
    // we can use to generate the report
    generateDump(req.patient, req.user, false, function (err, data) {
        if (err) return next(err);

        // build up pdfmake document definition (see their docs)
        var doc = {
            content: [],
            styles: {}
        };

        setupHeader(req.patient, req.user, start, end, doc);
        setupFooter(doc);
        setupStyles(doc);
        async.seq(
                setupMedications(req.patient, req.user, data, tz, start, end),
                setupSchedule(req.patient, req.user, tz, start, end)
        )(doc, function (err, doc) {
            if (err) return next(err);

            // set mime type
            res.header("Content-Type", "application/pdf");

            // generate PDF and pipe out into response
            var printer = new PdfPrinter(pdfFonts);
            var pdf = printer.createPdfKitDocument(doc);
            pdf.pipe(res);
            pdf.end();
        });
    });
});
