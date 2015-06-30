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
    // TODO: think about whether just using patient ID is a security risk
    // here (if patient ID counter is reset for whatever reason)
    PatientSchema.virtual("avatarFilename").get(function () {
        return "avatar_" + this._id;
    });

    // return a stream containing the avatar image
    PatientSchema.methods.getAvatar = function (done) {
        // check if file exists and return the default avatar if not
        gfs().exist({ filename: this.avatarFilename }, function (err, exists) {
            if (err) return done(err);

            var stream;
            if (exists) {
                // if the patient has a custom image stored use that
                stream = gfs().createReadStream({ filename: this.avatarFilename });
            } else {
                // return a read stream to the default avatar image on disk
                stream = fs.createReadStream("assets/default_avatar.png");
            }

            // return stream
            done(null, stream);
        }.bind(this));
    };

    // given a stream containing raw image data, set the avatar
    PatientSchema.methods.setAvatar = function (image, done) {
        // the image needs to be stored in gridfs and the mime type parsed
        // this takes two separate readers and hence two seperate streams
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
                // don't care about overwriting, so pipe the image straight into gridfs
                var writestream = gfs().createWriteStream({ filename: patient.avatarFilename });
                image.pipe(writestream);

                // store image in gridfs
                writestream.on("close", function () {
                    return callback();
                });
                writestream.on("error", callback);
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

    // get (web) path to avatar image, and include it in JSON serialisations
    // (ie JSON responses)
    PatientSchema.virtual("avatar").get(function () {
        return util.format("/v1/patients/%d/avatar.%s", this._id, this.avatarType.ext);
    });
    PatientSchema.options.toJSON = {
        transform: function (doc, ret) {
            ret.avatar = doc.avatar;
            return ret;
        }
    };
};
