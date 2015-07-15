var config = module.exports = {};

// notification settings
config.email = {
    from: "orange@amida-tech.com",
    sendgrid_api_key: "SENDGRID_API_KEY"
};
config.text = {
    from: "+1 (000) 000-0000",
    twilio_sid: "TWILIO_SID",
    twilio_auth_token: "TWILIO_AUTH_TOKEN"
};
