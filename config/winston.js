"use strict";

const  winston = require("winston");

const winstonInstance = winston.createLogger({
    level: "info",
    transports: [
        new winston.transports.Console(),
    ],
});

module.exports = winstonInstance
