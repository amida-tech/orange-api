"use strict";
var express         = require("express"),
    mongoose        = require("mongoose"),
    crud            = require("./helpers/crud.js"),
    list            = require("./helpers/list.js");

var FormularyEntry = mongoose.model("FormularyEntry");
var formularyEntries = module.exports = express.Router({ mergeParams: true });

// Fields we want to output in JSON response (in addition to ID)
var formatList = crud.formatListGenerator(
  ["vaClass", "genericName", "dosageForm", "restriction", "comments"],
  "formularyEntries"
);
var returnListData = crud.returnListData;
// Search formulary
var paramParser = list.parseListParameters(["id"], ["vaClass", "genericName"]);
formularyEntries.get("/search", paramParser, function (req, res, next) {
    var params = {
        limit: req.listParameters.limit,
        offset: req.listParameters.offset,
        sortBy: req.listParameters.sortBy,
        sortOrder: req.listParameters.sortOrder,
        vaClass: req.listParameters.filters.vaClass,
        genericName: req.listParameters.filters.genericName
    };

    // the model handles the querying for us
    return FormularyEntry.findByParameters({}, params, returnListData(res, next));
}, formatList);
