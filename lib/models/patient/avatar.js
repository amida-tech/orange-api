"use strict";

var fs              = require("fs"),
    util            = require("util"),
    imageType       = require("image-type"),
    errors          = require("../../errors.js").ERRORS,
    PassThrough     = require("stream").PassThrough;

// take a callback and return a second callback
// the first callback should take (err, stream, mimeType)
// the returned callback takes (err, stream) and calculates mimeType on the stream
var mimetypeCallback = function (callback) {
    return function (err, stream) {
        if (err) return callback(err);

        // we have to duplicate the stream with PassThrough so we can read it
        var streamA = new PassThrough();
        var streamB = new PassThrough();
        stream.pipe(streamA);
        stream.pipe(streamB);

        // first we need to determine content type. the image-type library does that from
        // the first 12 bytes so we capture those into a buffer (image-type doesn't support
        // streams natively)
        var buffer = new Buffer(12);
        var offset = 0; // number of bytes captured so far
        var dataListener = function (chunk) {
            // read a maximum of 12 bytes
            var length = chunk.length;
            if (length > 12) length = 12;

            // copy maximum of 12 bytes from this chunk into buffer
            chunk.copy(buffer, offset, 0, length);

            // write from this offset next time
            offset += length;

            // if finished reading
            if (offset >= 12) {
                var type = imageType(buffer);

                // if the image could not successfully be parsed, return an error
                if (type === null) return errors.INVALID_IMAGE;

                // remove listener to clean up
                streamA.removeListener("data", dataListener);

                // return both stream and mime type
                callback(null, streamB, type.mime);
            }
        };
        streamA.on("data", dataListener);
    };
};

// get and set patient avatar from gridfs
// gfs = preconnected gridfs client
module.exports = function (PatientSchema, gfs) {
    // ID for avatar
    // unique across the entire gridfs collection (currently just avatars),
    // not just across patient avatars
    PatientSchema.virtual("avatarId").get(function () {
        return this._id;
    });

    // return a stream containing the avatar image
    // TODO: think about whether just using patient ID is a security risk
    // here (if patient ID counter is reset for whatever reason)
    PatientSchema.methods.getAvatar = function (done) {
        // as well as returning the stream we want to find it's mime type
        // (from image data rather than stored mime type as stored mime type
        // is based upon the original Content-Type header sent which could
        // be inaccurate)
        var callback = mimetypeCallback(done);

        // check if file exists and return the default avatar if not
        gfs().exist({ _id: this.avatarId }, function (err, exists) {
            if (err) return done(err);

            var stream;
            if (exists) {
                callback(true);
            } else {
                // return a read stream to the default avatar image on disk
                stream = fs.createReadStream("assets/default_avatar.png");
            }

            // return stream
            callback(null, stream);
        });
    };

    // get (web) path to avatar image, and include it in JSON serialisations
    // (ie JSON responses)
    PatientSchema.virtual("avatar").get(function () {
        // TODO: use fully qualified paths in here somehow
        return util.format("/api/v1/patients/%d/avatar", this._id);
    });
    PatientSchema.options.toJSON = {
        transform: function (doc, ret, options) {
            ret.avatar = doc.avatar;
            return ret;
        }
    };
};
