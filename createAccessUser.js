const config = require("./config")

const Client = require('node-rest-client').Client;
const authUrl = `${config.authServiceAPI}/user`;


const client = new Client();

const userArgs = {
    headers : {"Content-Type": "application/json"},
    data: {
        email: "admin@amida.com",
        username: config.microserviceAccessKey,
        password: config.microservicePassword,
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
