"use strict";
var chakram = require("chakram"),
    extend  = require("xtend");

var expect = chakram.expect;

// setup chakram (REST API helper library)
before(function () {
    chakram.addProperty("api", function () {});

    // validate failed responses
    var errorSchema = {
        required: ["errors", "success"],
        properties: {
            errors: {
                type: "array",
                minItems: 1,
                "items": { type: "string" },
                "uniqueItems": true
            },
            success: {
                type: "boolean",
                pattern: "false"
            }
        }
    };
    chakram.addMethod("error", function (respObj, status, errors) {
        // allow single error strings to be passed in (but not returned by API)
        if (typeof errors === "string") errors = [errors];

        expect(respObj).to.have.schema(errorSchema);
        expect(respObj).to.have.status(status);
        expect(respObj).to.have.json("errors", errors);
    });

    // generic method for successful responses (doesn't validate schema)
    chakram.addMethod("genericSuccess", function (respObj, status) {
        // for debugging
        if (typeof respObj.body.errors !== "undefined") console.log(respObj.body.errors);

        expect(respObj).to.have.json("success", true);
        if (typeof status !== "undefined" && status !== null)
            expect(respObj).to.have.status(status); // usually 200, but 201 for POST
    });
    // generic methods for different HTTP types (POST = 201 status code, others = 200)
    chakram.addProperty("postSuccess", function (respObj) {
        expect(respObj).to.be.an.api.genericSuccess(201);
    });
    chakram.addProperty("putSuccess", function (respObj) {
        expect(respObj).to.be.an.api.genericSuccess(200);
    });
    chakram.addProperty("getSuccess", function (respObj) {
        expect(respObj).to.be.an.api.genericSuccess(200);
    });
    chakram.addProperty("deleteSuccess", function (respObj) {
        expect(respObj).to.be.an.api.genericSuccess(200);
    });

    // take an object schema and the slug for the list of objects, and validate a list
    // response (e.g., GET /patients)
    chakram.addMethod("genericListSuccess", function (respObj, slug, itemSchema) {
        expect(respObj).to.be.an.api.genericSuccess(200);

        // build up schema for overall response
        var schema = {
            required:   [slug, "count"],
            properties: {
                count:  { type: "number" }
            }
        };
        schema.properties[slug] = {
            type: "array",
            items: [itemSchema]
        };
        expect(respObj).to.have.schema(schema);
    });
});

module.exports.addApiChain = function (slug, properties) {
    var plugin = function (chai, utils) {
        // flag when we're inside this chain for namespacing
        utils.addChainableMethod(chai.Assertion.prototype, slug, null, function () {
            utils.flag(this, slug, true);
        });

        // add each property
        /*eslint-disable no-loop-func */
        for (var key in properties) {
            (function (name) {
                utils.overwriteProperty(chai.Assertion.prototype, name, function (_super) {
                    return function () {
                        if (utils.flag(this, slug)) {
                            // if we're inside the relevant chain
                            var respObj = utils.flag(this, "object");
                            properties[name](respObj);
                        } else {
                            // otherwise don't check anything
                            _super.call(this);
                        }
                    };
                });
            })(key);
        }
        /*eslint-enable no-loop-func */
    };
    chakram.initialize(plugin);
};
