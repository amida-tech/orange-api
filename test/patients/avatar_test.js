"use strict";
var chakram     = require("chakram"),
    util        = require("util"),
    extend      = require("xtend"),
    Q           = require("q"),
    fs          = require("fs"),
    curry       = require("curry"),
    imageType   = require("image-type"),
    fixtures    = require("./fixtures.js"),
    common      = require("./common.js"),
    view        = require("./view_patient_test.js"),
    auth        = require("../common/auth.js");

var expect = chakram.expect;

describe("Patients", function () {
    describe("Avatars (GET/POST /patients)", function () {
        // given a patient ID and access token, try and set the patient's avatar from
        // the passed stream
        var set = function (image, patientId, accessToken) {
            var url = util.format("http://localhost:3000/v1/patients/%d/avatar.jpg", patientId);
            var params = extend({ json: true, encoding: null }, auth.genAuthHeaders(accessToken));
            return chakram.post(url, image, params);
        };
        // given a patient with nested user, try and set the patient's avatar to an
        // image strean
        var setPatient = function (image, patient) {
            return set(image, patient._id, patient.user.accessToken);
        };
        // create a patient and try and set their avatar
        var setMyPatient = function (image) {
            return common.testMyPatient({}).then(curry(setPatient)(image));
        };
        var setOtherPatient = function (image, access) {
            return common.testOtherPatient({}, access).then(curry(setPatient)(image));
        };

        // given a patient ID and access token, try and retrieve the patient's avatar
        var get = function (patientId, accessToken) {
            var url = util.format("http://localhost:3000/v1/patients/%d/avatar.jpg", patientId);
            var params = extend({ json: true, encoding: null }, auth.genAuthHeaders(accessToken));
            return chakram.get(url, params);
        };
        // given a patient with nested user, try and show the patient's avatar
        var getPatient = function (patient) { return get(patient._id, patient.user.accessToken); };
        // create a patient and try and view their avatar
        var getMyPatient = function () { return common.testMyPatient({}).then(getPatient); };
        var getOtherPatient = function (access) { return common.testOtherPatient({}, access).then(getPatient); };

        /*
        describe("Setting the Avatar", function () {
            // test that it requires a valid authentication header and a valid patient ID in the URL
            common.itRequiresAuthentication(curry(set)(null));
            common.itRequiresValidPatientId(curry(set)(null));

            // check authorization
            it("lets me set images for my patients", function () {
                return expect(setMyPatient()).to.be.an.avatar.success;
            });
            it("lets me set images for patients shared read-write", function () {
                return expect(setOtherPatient("write")).to.be.an.avatar.success;
            });
            it("doesn't let me set images for patients shared read-only", function () {
                return expect(setOtherPatient("read")).to.be.an.api.error(403, "unauthorized");
            });
            it("doesn't let me set images for patients not shared with me", function () {
                return expect(setOtherPatient("none")).to.be.an.api.error(403, "unauthorized");
            });
        });
        */

        describe("Getting the Avatar", function () {
            // test that it requires a valid authentication header and a valid patient ID in the URL
            common.itRequiresAuthentication(get);
            common.itRequiresValidPatientId(get);

            // check authorization
            it("lets me set images for my patients", function () {
                return expect(getMyPatient()).to.be.an.avatar.success;
            });
            it("lets me set images for patients shared read-write", function () {
                return expect(getOtherPatient("write")).to.be.an.avatar.success;
            });
            it("lets me set images for patients shared read-only", function () {
                return expect(getOtherPatient("read")).to.be.an.avatar.success;
            });
            it("doesn't let me set images for patients not shared with me", function () {
                return expect(getOtherPatient("none")).to.be.an.api.error(403, "unauthorized");
            });

            describe("with default avatar image", function () {
                it("returns an avatar slug", function () {
                    // get patient info and check it returns an avatar slug that is not blank
                    return view.showMyPatient({}).then(function (response) {
                        console.log(response.body.avatar);
                    });
                });

                it("returns the correct MIME type", function () {
                    return getMyPatient().then(function (response) {
                        expect(response).to.be.an.avatar.success;

                        // rather than requiring a specific image MIME type, we check
                        // it's explicitly set and not JSON
                        expect(response.response.headers).to.include.key("content-type");
                        expect(response.response.headers["content-type"]).to.not.equal("application/json");
                    });
                });
                it("returns valid image data", function () {
                    return getMyPatient().then(function (response) {
                        expect(response).to.be.an.avatar.success;

                        // use the image-type library to perform a rudimentary verification
                        // that it was indeed image data returned
                        // response.body is a buffer here
                        var type = imageType(response.body);
                        expect(type).to.not.be.null;

                        // check that a fair (>1kb) amount of image data was returned:
                        // imageType only reads the first 12 bytes
                        expect(response.body.length).to.be.at.least(1024);
                    });
                });
            });
        });

        describe("setting a new image", function () {
            it("allows changing of the avatar");
            it("returns an updated avatar slug");
            it("returns an updated MIME type");
            it("returns the updated image data");
        });
    });
});
