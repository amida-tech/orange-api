const { configuredFormatter } = require('winston-json-formatter');

const { createLogger, transports } = require('winston');
const pjson = require('./package.json');

const logger = createLogger({
    level: process.env.LOG_LEVEL,
    transports: [
        new transports.Console(),
    ],
});

const options = {
    service: 'orange-demo-data-generator',
    logger: 'application-logger',
    version: pjson.version,
};

logger.format = configuredFormatter(options);

module.exports = logger;
