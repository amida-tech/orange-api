"use strict";
var chakram = require("chakram");

var expect = chakram.expect;

// setup chakram (REST API helper library)
before(function () {
    chakram.addProperty("api", function () {});

    chakram.addMethod("error", function (respObj, status, errors) {
        // allow single error strings to be passed in (but not returned by API)
        expect(respObj).to.have.status(status);
        expect(respObj).to.have.json("code", errors.toUpperCase());
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
    chakram.addMethod("genericListSuccess", function (respObj, slug, itemSchema, countRequired) {
        expect(respObj).to.be.an.api.genericSuccess(200);

        // remove success from schema (in case it's present)
        itemSchema = JSON.parse(JSON.stringify(itemSchema));
        if (typeof itemSchema.required !== "undefined" && itemSchema.required !== null) {
            var successIndex = itemSchema.required.indexOf("success");
            if (successIndex >= 0) itemSchema.required.splice(successIndex, 1);
        }
        if (typeof itemSchema.properties !== "undefined" && itemSchema.properties !== null) {
            delete itemSchema.properties.success;
        }

        // require a count by default
        if (countRequired !== false) countRequired = true;
        var required = ["success", slug];
        if (countRequired) required.push("count");

        // build up schema for overall response
        /*eslint-disable key-spacing */
        var schema = {
            required:   required,
            properties: {
                success:    { type: "boolean" },
                count:      { type: "number" }
            },
            additionalProperties: !countRequired, // allow extra properties in place of count,
            definitions: itemSchema.definitions
        };
        schema.properties[slug] = {
            type:  "array",
            items: [itemSchema]
        };
        /*eslint-enable key-spacing */
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
