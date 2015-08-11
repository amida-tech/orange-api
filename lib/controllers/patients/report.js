"use strict";
var express         = require("express"),
    pdfmake         = require("pdfmake"),
    // see pdfmake examples/ in repo
    PdfPrinter      = require("../../../node_modules/pdfmake/src/printer"),
    auth            = require("../helpers/auth.js"),
    generateDump    = require("../helpers/dump.js");

// place fonts into top-level fonts/ directory
var pdfFonts = {
	Roboto: {
		normal: "fonts/Roboto-Regular.ttf"
	}
};

var report = module.exports = express.Router({ mergeParams: true });

// View PDF report of the patient's data
report.get("/", auth.authenticate, auth.authorize("read"), function (req, res, next) {
    // generateDump handles access permissions for us to return a big flat js object
    // we can use to generate the report
    generateDump(req.patient, req.user, function (err, results) {
        if (err) return next(err);

        // build up pdfmake document definition (see their docs)
        var doc = { content: "Sample Text" };

        // set mime type
        res.header("Content-Type", "application/pdf");

        // generate PDF and pipe out into response
        var printer = new PdfPrinter(pdfFonts);
        var pdf = printer.createPdfKitDocument(doc);
        pdf.pipe(res);
        pdf.end();
    });
});
