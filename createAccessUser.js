const Client = require('node-rest-client').Client;
const authUrl = "http://localhost:4000/api/v1/user";


const client = new Client();

const userArgs = {
    headers : {"Content-Type": "application/json"},
    data: {
        email: "admin@amida.com",
        username: "oucuYaiN6pha3ahphiiT",
        password: "@TestTest1",
        scopes: ["admin"]
    }

}

const createUser = function(args, callback) {
    client.post(authUrl, userArgs, function (data, response) {
        callback(data);
    });
};

const main = function () {
    createUser(userArgs, function(response) {
        console.log("Created user on auth service", response);
    })
}

main();
