"use strict";
var chakram     = require("chakram"),
    util        = require("util"),
    request     = require("request"),
    extend      = require("xtend"),
    stream      = require("stream"),
    Q           = require("q"),
    fs          = require("fs"),
    curry       = require("curry"),
    imageType   = require("image-type"),
    common      = require("./common.js"),
    view        = require("./view_patient_test.js"),
    auth        = require("../common/auth.js");

var expect = chakram.expect;

describe("Patients", function () {
    describe("Avatars (GET/POST /patients)", function () {
        // given a patient ID and access token, try and set the patient's avatar from
        // the passed stream
        var set = function (imageStream, patientId, accessToken) {
            // for convenience allow strings to be passed in and convert those to streams
            if (typeof imageStream === "string") {
                // see http://stackoverflow.com/questions/12755997
                var s = new stream.Readable();
                s._read = function () {}; // _read method required
                s.push(imageStream);
                s.push(null);
                imageStream = s;
            }

            // chakram doesn't handle streams here so we have to use the raw response library
            var options = {
                url: util.format("http://localhost:3000/v1/patients/%d/avatar.jpg", patientId),
                method: "POST",
                json: true,
                headers: auth.genAuthHeaders(accessToken).headers,
                jar: request.jar()
            };
            var deferred = Q.defer();
            var req = request(options, function (err, response, body) {
                // taken from dareid/chakram/blob/0b5703ba59c63604f24083e35a8629fce454c106/lib/methods.js
                deferred.resolve({
                    error: err,
                    response: response,
                    body: body,
                    jar: options.jar,
                    url: options.url
                });
            });
            imageStream.pipe(req);
            return deferred.promise;
        };
        // given a patient with nested user, try and set the patient's avatar to an
        // image strean
        var setPatient = function (image, patient) {
            return set(image, patient._id, patient.user.accessToken);
        };
        // create a patient and try and set their avatar
        var setAPatient = function (image) {
            return common.testMyPatient({}).then(curry(setPatient)(image));
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
        var getAPatient = function () { return common.testMyPatient({}).then(getPatient); };

        describe("Setting the Avatar", function () {
            // placeholder = valid image stream
            var placeholder = function () {
                return fs.createReadStream("./test/patients/test_image.jpg");
            };

            // test that it requires a valid authentication header and a valid patient ID in the URL
            common.itRequiresAuthentication(curry(set)(placeholder()));
            common.itRequiresValidPatientId(curry(set)(placeholder()));
            common.itRequiresWriteAuthorization(function (patient) {
                // placeholder must be called again for each test itRequiresWriteAuthorization generates
                return setPatient(placeholder(), patient);
            });

            it("lets me set images for my patients", function () {
                return expect(setAPatient(placeholder())).to.be.an.avatar.setSuccess;
            });

            it("should not allow empty images", function () {
                return expect(setAPatient("")).to.be.an.api.error(400, "invalid_image");
            });
            it("should not allow invalid images", function () {
                return expect(setAPatient("foo")).to.be.an.api.error(400, "invalid_image");
            });
        });

        describe("Getting the Avatar", function () {
            // test that it requires a valid authentication header and a valid patient ID in the URL
            common.itRequiresAuthentication(get);
            common.itRequiresValidPatientId(get);
            // check it requires read access to the patient
            common.itRequiresAvatarReadAuthorization(getPatient);

            // check authorization
            it("lets me set images for my patients", function () {
                return expect(getAPatient()).to.be.an.avatar.imageSuccess;
            });

            describe("with default avatar image", function () {
                it("returns an avatar slug", function () {
                    // get patient info and check it returns an avatar slug that is not blank
                    return view.showAPatient({}).then(function (response) {
                        var avatarPath = response.body.avatar;
                        expect(avatarPath).to.not.be.blank;

                        // check a file extension is being returned
                        expect(avatarPath.split(/\.|\//).pop()).to.not.equal("avatar");
                    });
                });

                it("returns the correct MIME type", function () {
                    return getAPatient().then(function (response) {
                        expect(response).to.be.an.avatar.imageSuccess;

                        // rather than requiring a specific image MIME type, we check
                        // it's explicitly set and not JSON
                        expect(response.response.headers).to.include.key("content-type");
                        expect(response.response.headers["content-type"]).to.not.equal("application/json");
                    });
                });
                it("returns valid image data", function () {
                    return getAPatient().then(function (response) {
                        expect(response).to.be.an.avatar.imageSuccess;

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

        // most tests here rely on the fact that the default image is a PNG whereas the new image we're
        // uploading is a JPG
        describe("setting a new image", function () {
            // setup test user and patient
            var patient;
            before(function () {
                return auth.createTestUser().then(function (user) {
                    return common.createMyPatient({}, user);
                }).then(function (p) {
                    // store created patient (with user nested as patient.user)
                    patient = p;
                });
            });

            it("allows changing of the avatar", function () {
                var image = fs.createReadStream("./test/patients/test_image.jpg");
                return setPatient(image, patient).then(function (response) {
                    expect(response).to.be.an.avatar.setSuccess;
                    // check file extension has been updated
                    expect(response.body.avatar.split(".").pop()).to.equal("jpg");
                });
            });

            it("returns an updated avatar slug", function () {
                // check avatar URL file extension has been updated in GET /patients/:id
                return view.showPatient(patient).then(function (response) {
                    expect(response.body.avatar.split(".").pop()).to.equal("jpg");
                });
            });

            it("returns an updated MIME type", function () {
                return getPatient(patient).then(function (response) {
                    expect(response.response.headers).to.include.key("content-type");
                    expect(response.response.headers["content-type"]).to.equal("image/jpeg");
                });
            });

            it("returns the updated image data", function () {
                return getPatient(patient).then(function (response) {
                    expect(response).to.be.an.avatar.imageSuccess;

                    // check a valid *jpeg* image was returned
                    var type = imageType(response.body);
                    expect(type).to.not.be.null;
                    expect(type.mime).to.equal("image/jpeg");

                    // check that a fair (>1kb) amount of image data was returned:
                    // imageType only reads the first 12 bytes
                    expect(response.body.length).to.be.at.least(1024);
                });
            });
        });
    });
});
