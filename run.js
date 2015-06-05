// Run server
var server = require("./app.js").listen(3000, function () {
    var host = server.address().address;
    var port = server.address().port;

    console.log('Orange API listening at http://%s:%s', host, port);
});
