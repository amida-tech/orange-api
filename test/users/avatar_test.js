"use strict";
var chakram     = require("chakram"),
    fixtures    = require("./fixtures.js"),
    request     = require("request"),
    extend      = require("xtend"),
    stream      = require("stream"),
    Q           = require("q"),
    fs          = require("fs"),
    curry       = require("curry"),
    imageType   = require("image-type"),
    view        = require("./view_user_info_test.js"),
    auth        = require("../common/auth.js");

var expect = chakram.expect;

describe("Users", function () {
    describe("Avatars (GET/POST /user/avatar)", function () {
        // given an access token, try and set the user's avatar from
        // the passed stream
        var set = function (imageStream, accessToken) {
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
                url: "http://localhost:5000/v1/user/avatar.jpg",
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
        // given a user, try and set the user's avatar to an
        // image strean
        var setUser = function (image, token) {
            return set(image, token)
        };
        // create a user and try and set their avatar
        var setAUser = function (image) {
            return fixtures.create("User").then(function (u) {
              return auth.genAccessToken(u);
            }).then(curry(setUser)(image));
        };

        // given an access token, try and retrieve the user's avatar
        var get = function (accessToken) {
            var url = "http://localhost:5000/v1/user/avatar.jpg";
            var params = extend({ json: true, encoding: null }, auth.genAuthHeaders(accessToken));
            return chakram.get(url, params);
        };
        // given a user, try and show the user's avatar
        var getUser = function (token) { return get(token); };
        // create a user and try and view their avatar
        var getAUser = function () {
            return fixtures.create("User").then(function (u) {
              return auth.genAccessToken(u);
            }).then(getUser);
        };

        describe("Setting the Avatar", function () {
            // placeholder = valid image stream
            var placeholder = function () {
                return fs.createReadStream("./test/patients/test_image.jpg");
            };

            it("lets me set image for myself", function () {
                return expect(setAUser(placeholder())).to.be.an.avatar.setSuccess;
            });

            it("does not allow empty images", function () {
                return expect(setAUser("")).to.be.an.api.error(400, "invalid_image");
            });
            it("does not allow invalid images", function () {
                return expect(setAUser("foo")).to.be.an.api.error(400, "invalid_image");
            });
        });

        describe("Getting the Avatar", function () {
            // check authorization
            it("lets me get images for myself", function () {
                return expect(getAUser()).to.be.an.avatar.imageSuccess;
            });

            describe("with default avatar image", function () {
                it("returns an avatar slug", function () {
                    // get patient info and check it returns an avatar slug that is not blank
                    return view.viewUser({}).then(function (response) {
                        var avatarPath = response.body.avatar;
                        expect(avatarPath).to.be.a('string');
                        expect(avatarPath).to.not.be.blank;

                        // check a file extension is being returned
                        expect(avatarPath.split(/\.|\//).pop()).to.not.equal("avatar");
                    });
                });

                it("returns the correct MIME type", function () {
                    return getAUser().then(function (response) {
                        expect(response).to.be.an.avatar.imageSuccess;

                        // rather than requiring a specific image MIME type, we check
                        // it's explicitly set and not JSON
                        expect(response.response.headers).to.include.key("content-type");
                        expect(response.response.headers["content-type"]).to.not.equal("application/json");
                    });
                });
                it("returns valid image data", function () {
                    return getAUser().then(function (response) {
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
            function showUser(token) {
                return chakram.get("http://localhost:5000/v1/user/", auth.genAuthHeaders(token));
            }

            // setup test user and patient
            var user;
            var token;
            before(function () {
                return auth.createTestUser().then(function (u) {
                    user = u;
                    return u;
                }).then(auth.genAccessToken).then(function (t) {
                    token = t;
                });
            });

            it("allows changing of the avatar", function () {
                var image = fs.createReadStream("./test/patients/test_image.jpg");
                return setUser(image, token).then(function (response) {
                    expect(response).to.be.an.avatar.setSuccess;
                    // check file extension has been updated
                    expect(response.body.avatar.split(".").pop()).to.equal("jpg");
                });
            });

            it("returns an updated avatar slug", function () {
                // check avatar URL file extension has been updated in GET /patients/:id
                return showUser(token).then(function (response) {
                    expect(response.body.avatar.split(".").pop()).to.equal("jpg");
                });
            });

            it("returns an updated MIME type", function () {
                return getUser(token).then(function (response) {
                    expect(response.response.headers).to.include.key("content-type");
                    expect(response.response.headers["content-type"]).to.equal("image/jpeg");
                });
            });

            it("returns the updated image data", function () {
                return getUser(token).then(function (response) {
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

            // back to png now
            it("allows changing of the avatar again", function () {
                var image = fs.createReadStream("./test/patients/test_image.png");
                return setUser(image, token).then(function (response) {
                    expect(response).to.be.an.avatar.setSuccess;
                    // check file extension has been updated
                    expect(response.body.avatar.split(".").pop()).to.equal("png");
                });
            });

            it("returns an updated avatar slug", function () {
                // check avatar URL file extension has been updated in GET /patients/:id
                return showUser(token).then(function (response) {
                    expect(response.body.avatar.split(".").pop()).to.equal("png");
                });
            });

            it("returns an updated MIME type", function () {
                return getUser(token).then(function (response) {
                    expect(response.response.headers).to.include.key("content-type");
                    expect(response.response.headers["content-type"]).to.equal("image/png");
                });
            });

            it("returns the updated image data", function () {
                return getUser(token).then(function (response) {
                    expect(response).to.be.an.avatar.imageSuccess;

                    // check a valid *jpeg* image was returned
                    var type = imageType(response.body);
                    expect(type).to.not.be.null;
                    expect(type.mime).to.equal("image/png");

                    // check that a fair (>1kb) amount of image data was returned:
                    // imageType only reads the first 12 bytes
                    expect(response.body.length).to.be.at.least(1024);
                });
            });
        });
    });
});
