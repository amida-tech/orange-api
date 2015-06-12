"use strict";

var chakram = require("chakram");
var expect = chakram.expect;

before(function () {
    // namespacing
    chakram.addProperty("user", function () {} );

    // verify successful responses
    /*eslint-disable key-spacing */
    var userSchema = {
        required: ["email", "name"],
        properties: {
            email: { type: "string" },
            name:  { type: "string" }
        }
    };
    /*eslint-enable key-spacing */
    chakram.addProperty("success", function (respObj) {
        expect(respObj).to.be.an.api.postSuccess;
        expect(respObj).to.have.schema(userSchema);
    });
});
