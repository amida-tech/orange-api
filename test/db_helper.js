var mongoose = require('mongoose');

before(function (done) {
    if (mongoose.connection.db) {
        return done();
    }

    mongoose.connect('mongodb://localhost/orange-api', done);
});

after(function (done) {
    mongoose.connection.db.dropDatabase(done);
});
