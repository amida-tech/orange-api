"use strict";
var express         = require("express"),
    curry           = require("curry"),
    moment          = require("moment-timezone"),
    util            = require("util"),
    // see pdfmake examples/ in repo
    PdfPrinter      = require("../../../node_modules/pdfmake/src/printer"),
    auth            = require("../helpers/auth.js"),
    generateDump    = require("../helpers/dump.js");

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
var setupHeader = function (data, doc) {
    // config options for header
    var logoWidth = 201;
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
                    text: data.patient.name,
                    style: "headerBold"
                }
            ]
        });
        info.stack.push({
            text: [
                "TIME RANGE: ",
                {
                    text: data.time_range,
                    style: "headerBold"
                }
            ]
        });
        info.stack.push({
            text: [
                "USER: ",
                {
                    text: data.user.email,
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
var setupFooter = function (data, doc) {
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
var setupStyles = function (data, doc) {
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
    };
    doc.styles.itemHeader = {
        fontSize: 15,
        bold: true
    };
};

// format percentages
var perToStr = function (percentage) {
    if (isNaN(percentage)) return "";
    else return util.format(" (%d)", percentage);
};

// details for a single medication
var setupMedication = curry(function (data, medication) {
    // subdocument for medication
    var doc = [];

    // generate title from brand and name, handling cases when they're unknown
    doc.push({
        text: medication.summary,
        style: "itemHeader"
    });

    // generate a short summary of the schedule
    doc.push({
        text: medication.schedule_summary,
        style: "detailsText"
    });

    // taken with/without food
    if (medication.schedule.take_with_food !== null) {
        var label;
        if (medication.schedule.take_with_food) label = "Taken with food";
        else label = "Taken without food";
        doc.push({
            text: label,
            style: "detailsText"
        });
    }

    // add details for each 'time'
    if (medication.schedule.regularly) {
        doc.push(" "); // padding
        var timesDocs = medication.schedule.times.map(function (time) {
            // header string
            var heading = {
                text: time.heading,
                style: "detailsHeader"
            };

            // generate formatted string
            var adherence = util.format(
                "(Taken %d/%d, Skipped %d/%d, Not Recorded %d/%d)",
                time.statistics.taken, time.statistics.total,
                time.statistics.skipped, time.statistics.total,
                time.statistics.notRecorded, time.statistics.total
            );
            if (time.statistics.total === 0) adherence = "(No scheduled doses this report)";

            return {
                text: [heading, " - ", time.description, " ", adherence]
            };
        });
        doc.push({
            // ul: timesDocs // bullets
            stack: timesDocs // no bullets
        });
    }

    // add overall adherence stats
    if (medication.statistics !== null) {
        doc.push(" "); // padding

        // output three totals rows
        var stats = medication.statistics;
        doc.push({
            text: util.format("Events Taken: %d%s%", stats.taken, perToStr(stats.takenPercentage)),
            style: "detailsHeader"
        });
        doc.push({
            text: util.format("Events Skipped: %d%s%", stats.skipped, perToStr(stats.skippedPercentage)),
            style: "detailsHeader"
        });
        doc.push({
            text: util.format("Events Not Recorded: %d%s%", stats.notRecorded, perToStr(stats.notRecordedPercentage)),
            style: "detailsHeader"
        });
    }

    // add number of 'as needed' doses taken, with just a differing label if
    // medication is not marked as as needed
    if (medication.schedule.regularly && (medication.extra_doses > 0 || medication.schedule.asNeeded)) {
        doc.push(" "); // padding
        doc.push({
            text: util.format("Extra Doses Taken: %d", medication.extra_doses),
            style: "detailsHeader"
        });
    } else if (medication.schedule.asNeeded) {
        doc.push(" "); // padding
        doc.push({
            text: util.format("Doses Taken: %d", medication.extra_doses),
            style: "detailsHeader"
        });
    }

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

    return doc;
});

// add medications info
var setupMedications = function (data, doc) {
    // section header
    doc.content.push({
        text: "MEDICATIONS",
        style: "sectionHeader"
    });

    // output details for each of the user's medications
    data.medications.forEach(function (medication) {
        var medDoc = setupMedication(data, medication);
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
};

// create dosage log
var setupSchedule = function (data, doc) {
    // list of all schedule events
    doc.content.push({
        text: "DOSAGE LOGS",
        style: "sectionHeader",
        pageBreak: "before" // new page
    });

    // get all schedule match events in the time range
    var today = moment.tz(data.habits.tz).startOf("day");
    data.schedule.forEach(function (day) {
        var item = [];

        // skip dates in the future
        var date = moment.tz(day.date, "YYYY-MM-DD", data.habits.tz).startOf("day");
        if (date.isAfter(today)) return;

        // day header
        item.push({
            text: day.title,
            style: "itemHeader"
        });

        // adherence stats
        item.push({
            text: util.format(
                "%d Doses, %d Events (%d Taken, %d Skipped, %d Not Recorded)",
                day.statistics.doses,
                day.statistics.events,
                day.statistics.taken,
                day.statistics.skipped,
                day.statistics.notRecorded
            ),
            style: "detailsHeader"
        });

        // dislay details for each event on that day
        var events = day.events.map(function (event) {
            var outcome = {
                text: event.outcome,
                style: "detailsHeader"
            };
            return {
                text: [event.title, " - ", event.medication_label, " - ", outcome, event.note]
            };
        });
        item.push({ ul: events });

        // padding
        item.push(" ");

        doc.content.push({
            // put in a table so we each day is kept on the same page
            table: {
                dontBreakRows: true,
                body: [[ item ]]
            },
            layout: "noBorders"
        });
    });
};

// View PDF report of the patient's data
report.get("/", auth.authenticate, auth.authorize("read"), function (req, res, next) {
    // generateDump handles access permissions for us to return a big flat js object
    // we can use to generate the report
    generateDump(req.patient, req.user, req.query.start_date, req.query.end_date, function (err, data) {
        if (err) return next(err);

        // build up pdfmake document definition (see their docs)
        var doc = {
            content: [],
            styles: {}
        };

        setupHeader(data, doc);
        setupFooter(data, doc);
        setupStyles(data, doc);
        setupMedications(data, doc);
        setupSchedule(data, doc);

        // set mime type
        res.header("Content-Type", "application/pdf");

        // generate PDF and pipe out into response
        var printer = new PdfPrinter(pdfFonts);
        var pdf = printer.createPdfKitDocument(doc);
        pdf.pipe(res);
        pdf.end();
    });
});
