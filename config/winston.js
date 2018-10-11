"use strict";

const  winston = require("winston");

const config = require("../config.js");

const winstonInstance = winston.createLogger({
    level: config.logLevel,
    transports: [
        new winston.transports.Console(),
    ],
});

module.exports = winstonInstance
