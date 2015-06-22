"use strict";
var chakram = require("chakram");

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
        expect(respObj).to.have.json("success", true);
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
});
