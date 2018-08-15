'use strict';
//import Joi from 'joi';
const Joi = require("joi");
// require and configure dotenv, will load vars in .env in PROCESS.ENV
require('dotenv').config();

// define validation for all the env vars
const envVarsSchema = Joi.object({
    NOTIFICATION_EMAIL_FROM: Joi.string().email(),
    NOTIFICATION_SENDGRID_API_KEY: Joi.string().allow('')
        .description('Email Notification Sendgrid API Key'),
    TWILIO_TEXT_FROM: Joi.string(),
    TWILIO_SID: Joi.string(),
    TWILIO_AUTH_TOKEN: Joi.string(),
    FACEBOOK_CLIENT_ID: Joi.number()
        .default(149343912420944),
    FACEBOOK_CLIENT_SECRET: Joi.string()
        .default('66db0a9b905a5d12867a112ad8b83b6c'),
    FACEBOOK_CALLBACK_URL: Joi.string()
        .default('http://localhost:5000/v1/auth/facebook/callback'),
    FACEBOOK_PROFILE_FIELDS: Joi.array().items(Joi.string())
        .default(['id', 'name', 'displayName', 'picture', 'email']),
    MONGO_URI: Joi.string()
        .default('mongodb://localhost:27017/orange-api'),
    EXPRESS_PORT: Joi.number()
        .default(5000),
    X_CLIENT_SECRET: Joi.string().required()
        .description('X_CLIENT_SECRET is required. Its value must match the value of X_CLIENT_SECRET specified any client that calls this API.'),
    JWT_SECRET: Joi.string().required()
        .description('JWT Secret required to sign'),
    ACCESS_CONTROL_ALLOW_ORIGIN: Joi.string().required()
        .description('set to "null" to enable mobile apps. !!ARH add more better descriptionz.'),
    AUTH_MICROSERVICE_URL: Joi.string().allow('')
        .description('Auth microservice endpoint'),
    MONGO_SSL: Joi.boolean()
        .default(false)
        .description('Enable SSL connection to MongoDB'),
    MONGO_CERT_CA: Joi.string()
        .description('SSL certificate CA'), // Certificate itself, not a filename
    PUSH_NOTIFICATIONS_ENABLED: Joi.boolean()
        .default(false),
    PUSH_NOTIFICATIONS_APN_KEY_ID: Joi.string(),
    PUSH_NOTIFICATIONS_APN_TEAM_ID: Joi.string(),
    PUSH_NOTIFICATIONS_APN_ENV: Joi.string()
        .default('development'),
    PUSH_NOTIFICATIONS_APN_TOPIC: Joi.string()
        .default('com.amida.orangeIgnite'),
    PUSH_NOTIFICATIONS_FCM_SERVER_KEY: Joi.string()
        .optional(),
    PUSH_NOTIFICATIONS_FCM_API_URL: Joi.string(),
    PUSH_NOTIFICATIONS_SERVICE_USER_USERNAME: Joi.string(),
    PUSH_NOTIFICATIONS_SERVICE_USER_PASSWORD: Joi.string(),
    PUSH_NOTIFICATIONS_APN_ENABLED: Joi.boolean()
        .default(false),
    NOTIFICATION_MICROSERVICE_URL: Joi.string(),
}).unknown()
    .required();


const { error, value: envVars } = Joi.validate(process.env, envVarsSchema);
if (error) {
    throw new Error(`Config validation error: ${error.message}`);
}

const config = module.exports = {
    secret: envVars.X_CLIENT_SECRET,
    jwtSecret: envVars.JWT_SECRET,
    accessControlAllowOrigin: envVars.ACCESS_CONTROL_ALLOW_ORIGIN,
    authServiceAPI: envVars.AUTH_MICROSERVICE_URL,
    mongo: envVars.MONGO_URI,
    port: envVars.EXPRESS_PORT,
    ssl: envVars.MONGO_SSL,
    ssl_ca_cert: envVars.MONGO_CERT_CA,

    // Notification related
    apnKeyId: envVars.PUSH_NOTIFICATIONS_APN_KEY_ID,
    apnTeamId: envVars.PUSH_NOTIFICATIONS_APN_TEAM_ID,
    apnEnv: envVars.PUSH_NOTIFICATIONS_APN_ENV,
    apnTopic: envVars.PUSH_NOTIFICATIONS_APN_TOPIC,
    fcmServerKey: envVars.PUSH_NOTIFICATIONS_FCM_SERVER_KEY,
    fcmApiUrl: envVars.PUSH_NOTIFICATIONS_FCM_API_URL,
    microserviceAccessKey: envVars.PUSH_NOTIFICATIONS_SERVICE_USER_USERNAME,
    microservicePassword: envVars.PUSH_NOTIFICATIONS_SERVICE_USER_PASSWORD,
    pushNotificationsEnabled: envVars.PUSH_NOTIFICATIONS_ENABLED,
    apnEnabled: envVars.PUSH_NOTIFICATIONS_APN_ENABLED,
    notificationServiceAPI: envVars.NOTIFICATION_MICROSERVICE_URL,

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
