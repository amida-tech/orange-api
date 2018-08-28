"use strict";
var fs              = require("fs"),
    async           = require("async"),
    util            = require("util"),
    imageType       = require("image-type"),
    errors          = require("../../errors.js").ERRORS,
    PassThrough     = require("stream").PassThrough;

// get and set patient avatar from gridfs
// gfs = preconnected gridfs client
module.exports = function (PatientSchema, gfs) {
    // filename for avatar
    // unique across the entire gridfs collection (currently just avatars),
    // not just across patient avatars
    PatientSchema.virtual("avatarFilename").get(function () {
        return "avatar_" + this._id;
    });

    // return a stream containing the avatar image
    PatientSchema.methods.getAvatar = function (done) {
        // check if file exists and return the default avatar if not
        gfs().find({ filename: this.avatarFilename }, { limit: 1 }).count().then(count => {
            var stream;
            if (count > 0) {
                // if the patient has a custom image stored use that
                stream = gfs().openDownloadStreamByName(this.avatarFilename);
            } else {
                // return a read stream to the default avatar image on disk
                stream = fs.createReadStream("assets/default_avatar.png");
            }
            // return stream
            done(null, stream);
        }).catch(err => {
            if (err) return done(err);
        });
    };

    // given a stream containing raw image data, set the avatar
    PatientSchema.methods.setAvatar = function (image, done) {
        // the image needs to be stored in gridfs and the mime type parsed
        // this takes two separate readers and hence two separate streams
        if (image.body && image.body.base64Avatar) {
          return this.setBase64Avatar(image, done);
        }
        var imageA = new PassThrough();
        var imageB = new PassThrough();
        image.pipe(imageA);
        image.pipe(imageB);

        var patient = this;
        async.parallel({
            // parse MIME type
            mime: function (callback) {
                // attach image handler to update MIME type. image-type library does that from
                // the first 12 bytes so we capture those into a buffer (image-type doesn't support
                // streams natively)
                var buffer = new Buffer(12);
                var offset = 0; // number of bytes captured so far

                // if we finish reading the stream before we've got 12 bytes, it must
                // be an invalid image
                var doneHandler = function () {
                    return callback(errors.INVALID_IMAGE);
                };

                var handler = function (chunk) {
                    // read a maximum of 12 bytes from this chunk into buffer
                    var length = chunk.length;
                    if (length > 12) length = 12;
                    chunk.copy(buffer, offset, 0, length);
                    offset += length;

                    // if finished reading
                    if (offset >= 12) {
                        // remove handlers
                        imageA.removeListener("data", handler);
                        imageA.removeListener("end", doneHandler);

                        return callback(null, imageType(buffer));
                    }
                };
                imageA.on("data", handler);
                imageA.on("end", doneHandler);
            },
            store: function (callback) {
                async.seq(function (cb) {
                    // check if an image already exists for the patient
                    gfs().find({filename: patient.avatarFilename }, { limit: 1 }).next().then(avatar => {
                        // if it exists, remove it
                        if (avatar) {
                            gfs().delete(avatar._id, err => {
                                if (err) return cb(err);
                                return cb();
                            });
                        } else {
                            // otherwise carry on
                            return cb();
                        }
                    }).catch(err => {
                        if (err) return cb(err);
                    });
                }, function (cb) {
                    // pipe the image straight into gridfs
                    var writestream = gfs().openUploadStream(patient.avatarFilename);
                    imageB.pipe(writestream);

                    // store image in gridfs
                    writestream.on("finish", function () {
                        return cb();
                    });
                    writestream.on("error", cb);
                })(callback);
            }
        }, function (err, results) {
            if (err) return done(err);

            // invalid images
            if (results.mime === null) return done(errors.INVALID_IMAGE);

            // store mime type and save
            patient.avatarType = results.mime;
            patient.save(done);
        });
    };

    PatientSchema.methods.setBase64Avatar = function (req, done) {
        var b64string = req.body.base64Avatar;
        var buf = Buffer.from(b64string, "base64");
        var patient = this;
        var filename = patient.avatarFilename;
        gfs().find({ filename }, { limit: 1 }).next().then(avatar => {
            // if it exists, remove it
            if (avatar) {
                gfs().delete(avatar._id, function (err) {
                    if (err) done(err);
                });
            }
        }).then(() => {
            fs.writeFile(`${filename}`, buf, function (err) {
                if (err) throw err;
                // store image in gridfs
                var writestream = gfs().openUploadStream(filename);
                fs.createReadStream(`${filename}`).pipe(writestream);
                writestream.on("finish", function () {
                    fs.unlinkSync(filename);
                    patient.save(done);
                });
                writestream.on("error", done);
            });
        }).catch(err => {
            if (err) return done(err);
        });
    };

    // get (web) path to avatar image, and include it in JSON serialisations
    // (ie JSON responses)
    PatientSchema.virtual("avatar").get(function () {
        return util.format("/v1/patients/%d/avatar.%s", this._id, this.avatarType.ext);
    });
};
