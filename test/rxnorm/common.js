"use strict";

var chakram     = require("chakram"),
    common      = require("../common/chakram.js");
var expect = chakram.expect;

// verify successful responses
/*eslint-disable key-spacing */
var groupSchema = module.exports.schema = {
    required: ["success", "result"],
    properties: {
        success:    { type: "boolean" },
        result:     {
            type:       "object",
            required:   ["drugGroup", "compiled", "dfg", "brand"],
            properties: {
                drugGroup:  { type: "object" },
                compiled:   {
                    type:   "array",
                    items:  { type: "object" }
                },
                dfg:        {
                    type:   "array",
                    items:  { type: "string" }
                },
                brand:      {
                    type:   "array",
                    items:  { type: "string" }
                }
            },
            additionalProperties: false
        }
    },
    additionalProperties: false
};
var spellingSchema = module.exports.schema = {
    required: ["success", "result"],
    properties: {
        success:    { type: "boolean" },
        result:     {
            type:       "object",
            required:   ["suggestionGroup"],
            properties: {
                suggestionGroup: {
                    type:       "object",
                    required:   ["name", "suggestionList"],
                    properties: {
                        name:       { type: "string" },
                        suggestionList: {
                            type:       "object",
                            required:   ["suggestion"],
                            properties: {
                                suggestion: {
                                    type:   "array",
                                    items:  { type: "string" }
                                }
                            },
                            additionalProperties: false
                        }
                    },
                    additionalProperties: false
                }
            },
            additionalProperties: false
        }
    },
    additionalProperties: false
};
/*eslint-enable key-spacing */
common.addApiChain("rxnorm", {
    "groupSuccess": function (respObj) {
        expect(respObj).to.be.an.api.getSuccess;
        expect(respObj).to.have.schema(groupSchema);
    },
    "spellingSuccess": function (respObj) {
        expect(respObj).to.be.an.api.getSuccess;
        expect(respObj).to.have.schema(spellingSchema);
    }
});
