//import Joi from 'joi';
const Joi = require("joi");
// require and configure dotenv, will load vars in .env in PROCESS.ENV
require('dotenv').config();


// define validation for all the env vars
const envVarsSchema = Joi.object({
    NOTIFICATION_EMAIL_FROM: Joi.string().email()
        .default('orange@amida-tech.com'),
    NOTIFICATION_SENDGRID_API_KEY: Joi.string().allow('')
        .description('Email Notification Sendgrid API Key'),
    TWILIO_TEXT_FROM: Joi.string()
        .default('+1 (617) 000-0000'),
    TWILIO_SID: Joi.string()
        .default('ACXXXXXXX SID HERE'),
    TWILIO_AUTH_TOKEN: Joi.string()
        .allow(''),
    FACEBOOK_CLIENT_ID: Joi.number()
        .default(149343912420944),
    FACEBOOK_CLIENT_SECRET: Joi.string()
        .default('66db0a9b905a5d12867a112ad8b83b6c'),
    FACEBOOK_CALLBACK_URL: Joi.string()
        .default('http://localhost:5000/v1/auth/facebook/callback'),
    FACEBOOK_PROFILE_FIELDS: Joi.string().default(''),
        //.default(['id', 'name', 'displayName', 'picture', 'email']),
    MONGO: Joi.string()
        .default('mongodb://localhost/orange-api'),
    ZEROPC: Joi.string()
        .default('tcp://127.0.0.1:4242'),
    EXPRESS_PORT: Joi.number()
        .default(5000),
    EXPRESS: Joi.string()
        .default('localhost'),
    SECRET: Joi.string().required()
        .default('testsecret'),
    JWT_SECRET: Joi.string().required()
        .description('JWT Secret required to sign'),
    AUTH_MICROSERVICE: Joi.string().allow('')
        .description('Auth microservice endpoint'),
    ENABLE_PUSH_NOTIFICATIONS: Joi.bool()
        .default(false),
    MONGO_SSL: Joi.bool()
        .default(false)
        .description('Enable SSL connection to MongoDB'),
    MONGO_CERT_CA: Joi.string()
        .description('SSL certificate CA'), // Certificate itself, not a filename
}).unknown()
    .required();

const { error, value: envVars } = Joi.validate(process.env, envVarsSchema);
if (error) {
    throw new Error(`Config validation error: ${error.message}`);
}




const config = module.exports = {
    //env: envVars.NODE_ENV,
    secret: envVars.SECRET,
    jwtSecret: envVars.JWT_SECRET,
    authServiceAPI: envVars.AUTH_MICROSERVICE,
    mongo: envVars.MONGO,
    zerorpc: envVars.ZEROPC,
    port: envVars.EXPRESS_PORT,
    listen: envVars.EXPRESS,
    ssl: envVars.MONGO_SSL,
    ssl_ca_cert: envVars.MONGO_CERT_CA,
    email: {
      from: envVars.NOTIFICATION_EMAIL_FROM,
      sendgrid_api_key: envVars.NOTIFICATION_SENDGRID_API_KEY,
    },
    text: {
      from: envVars.TWILIO_TEXT_FROM,
      twilio_sid: envVars.TWILIO_SID,
      twilio_auth_token: envVars.TWILIO_AUTH_TOKEN,
    },
    logger: {
        stdout: {
            level: "info"
        }
    },
    facebook: {
      clientID: envVars.FACEBOOK_CLIENT_ID,
      clientSecret: envVars.FACEBOOK_CLIENT_SECRET,
      callbackURL: envVars.FACEBOOK_CALLBACK_URL,
      profileFields: envVars.FACEBOOK_PROFILE_FIELDS,
    }

}
