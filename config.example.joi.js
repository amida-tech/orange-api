import Joi from 'joi';
// require and configure dotenv, will load vars in .env in PROCESS.ENV
require('dotenv').config();

// define validation for all the env vars
const envVarsSchema = Joi.object({
    NODE_ENV: Joi.string()
        .allow(['development', 'production', 'test', 'provision'])
        .default('development'),
    PORT: Joi.number()
        .default(4001),
    JWT_SECRET: Joi.string().required()
        .description('JWT Secret required to sign'),
    PG_DB: Joi.string().required()
        .description('Postgres database name'),
    PG_PORT: Joi.number()
        .default(5432),
    PG_HOST: Joi.string()
        .default('localhost'),
    PG_USER: Joi.string().required()
        .description('Postgres username'),
    PG_PASSWD: Joi.string().allow('')
        .description('Postgres password'),
    MONGO_SSL: Joi.bool()
        .default(false)
        .description('Enable SSL connection to MongoDB'),
    MONGO_CERT_CA: Joi.string()
        .description('SSL certificate CA'), // Certificate itself, not a filename
    TEST_TOKEN: Joi.string().allow('')
        .description('Test auth token'),
    AUTH_MICROSERVICE: Joi.string().allow('')
        .description('Auth microservice endpoint'),
    NOTIFICATION_MICROSERVICE: Joi.string().allow('')
        .description('Notification Microservice endpoint'),
    MICROSERVICE_ACCESS_KEY: Joi.string().allow('')
        .description('Microservice Access Key'),
    MICROSERVICE_PASSWORD: Joi.string().allow('')
        .description('Microservice Password'),
    ENABLE_PUSH_NOTIFICATIONS: Joi.bool()
        .default(false),
}).unknown()
    .required();

const { error, value: envVars } = Joi.validate(process.env, envVarsSchema);
if (error) {
    throw new Error(`Config validation error: ${error.message}`);
}

const config = {
    env: envVars.NODE_ENV,
    port: envVars.PORT,
    jwtSecret: envVars.JWT_SECRET,
    testToken: envVars.TEST_TOKEN,
    authMicroService: envVars.AUTH_MICROSERVICE,
    notificationMicroservice: envVars.NOTIFICATION_MICROSERVICE,
    microserviceAccessKey: envVars.MICROSERVICE_ACCESS_KEY,
    microservicePassword: envVars.MICROSERVICE_PASSWORD,
    enablePushNotifications: envVars.ENABLE_PUSH_NOTIFICATIONS,
    postgres: {
        db: envVars.PG_DB,
        port: envVars.PG_PORT,
        host: envVars.PG_HOST,
        user: envVars.PG_USER,
        passwd: envVars.PG_PASSWD,
    },
    ssl: envVars.MONGO_SSL,
    ssl_ca_cert: envVars.MONGO_CERT_CA
};

export default config;
