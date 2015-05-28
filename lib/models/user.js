var mongoose = require('mongoose');
var uniqueValidator = require('mongoose-unique-validator');
mongoose.connect('mongodb://localhost/orange-api');

var bcrypt = require('bcrypt');
var SALT_WORK_FACTOR = 10;

var UserSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        index: { unique: true },
        match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Invalid email address']
    },
    password: { type: String, required: true}, // hashed
    name: String
});
UserSchema.plugin(uniqueValidator); // Give errors when email uniqueness broken

// Hash passwords
// Based upon http://blog.mongodb.org/post/32866457221
UserSchema.pre('save', function (next) {
    var user = this;

    // Only rehash if password modified
    // Important: not just for efficiency, but otherwise we'd be hashing
    // our hashes
    if (!user.isModified('password')) return next();

    // Generate a salt
    bcrypt.genSalt(SALT_WORK_FACTOR, function(err, salt) {
        if (err) return next(err);

        // Hash the password using our new salt
        bcrypt.hash(user.password, salt, function(err, hash) {
            if (err) return next(err);

            // Override the cleartext password with the hashed one
            user.password = hash;
            next();
        });
    });
});

// Authenticate a specific user
UserSchema.methods.authenticate = function (candidatePassword, callback) {
    bcrypt.compare(candidatePassword, this.password, function (err, isMatch) {
        if (err) { return callback(err); }
        callback(null, isMatch);
    });
};

// Authenticate an email and password
UserSchema.statics.authenticate = function (email, password, callback) {
    this.findOne({ email: email }, function (err, user) {
        if (err) { return callback(err); }
        if (!user) {
            return callback(new Error('User not found'));
        }
        user.authenticate(password, function (sErr, isMatch) {
            if (isMatch) {
                return callback(null, user);
            } else {
                return callback(new Error('Invalid password'));
            }
        });
    });
}

var User = module.exports = mongoose.model('User', UserSchema);
