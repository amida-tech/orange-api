"use strict";
var express         = require("express"),
    crud            = require("./helpers/crud.js"),
    list            = require("./helpers/list.js"),
    auth            = require("./helpers/auth.js");

var documentSignatures = module.exports = express.Router({ mergeParams: true });

// Helpers to DRY up CRUD controllers: see helpers/crud.js
// Fields we want to output in JSON responses (in addition to ID)
var keys = module.exports.keys = ["documentName", "version"];
var inputKeys = keys;
var outputKeys = keys.concat(["dateSigned"]);
var filterInput = crud.filterInputGenerator(inputKeys),
    formatObjectCode = crud.formatObjectGenerator(outputKeys),
    // formatObject = formatObjectCode(200),
    formatList = crud.formatListGenerator(outputKeys, "documentSignatures"),
    returnData = crud.returnData,
    returnListData = crud.returnListData;

// create new document signature belonging to the specified patient
// requireWrite ensures the current user has write access to the specified patient,
// rather than just any (read _or_ write access)
documentSignatures.post("/", auth.authorize("write"), filterInput, function (req, res, next) {
    req.patient.createDocumentSignature(req.data, returnData(res, next));
}, formatObjectCode(201)); // return 201 status code

// No need for getting a single signature
// // get a document signature belonging to the specified patient
// documentSignatures.get("/:documentSignatureId", auth.authorize("read"), function (req, res, next) {
//     req.patient.findDocumentSignatureById(req.params.documentSignatureId, returnData(res, next));
// }, formatObject);

// Probably shouldn't allow unsigning documents
// // remove a document signature belonging to the specified patient (write access required)
// documentSignatures.delete("/:documentSignatureId", auth.authorize("write"), function (req, res, next) {
//     req.patient.findDocumentSignatureByIdAndDelete(req.params.documentSignatureId, returnData(res, next));
// }, formatObject);

// Probably shouldn't allow modifying signatures
// // update a document signature belonging to the specified patient (write access required)
// documentSignatures.put("/:documentSignatureId", auth.authorize("write"), filterInput, function (req, res, next) {
//     req.patient.findDocumentSignatureByIdAndUpdate(req.params.documentSignatureId, req.data, returnData(res, next));
// }, formatObject);

// view a listing of all document signatures belonging to the specified patient
var paramParser = list.parseListParameters(["id", "documentName"], ["documentName"]);
documentSignatures.get("/", auth.authorize("read"), paramParser, function (req, res, next) {
    req.patient.queryDocumentSignatures(req.listParameters, req.user, req.patient, returnListData(res, next));
}, formatList);
