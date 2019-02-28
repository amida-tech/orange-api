"use strict";

const config  = require("../../../config.js");
const request = require("request");

module.exports = function (UserSchema) {

    UserSchema.methods.sendPushNotification = function (payload) {
        if (!config.pushNotificationsEnabled) return;
        var user = this;

        const username = user.email;
        const pushData = [
            Object.assign({username, namespace: "OrangeMobile"}, payload)
        ];

        const authArgs = {
            url: `${config.authServiceAPI}/auth/login`,
            headers: { "Content-Type": "application/json" },
            json: true,
            body: {
              username: config.pushNotificationsServiceUserUsername,
              password: config.pushNotificationsServiceUserPassword
            }
        };

        request.post(authArgs, function (err, res) {
            if (err) {
                console.log(`${new Date()} Error: pushNotifications.js: Push notificatios cron job call to Auth Service failed. Aborting.`, err);
                return;
            }

            const { token } = res.body;
            const pushNotificationArgs = {
                url: `${config.notificationServiceAPI}/notifications/sendPushNotifications`,
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": "Bearer " + token
                },
                json: true,
                body: { pushData }
            };

            request.post(pushNotificationArgs, function (err) {
                if (err) {
                    console.log(`${new Date()} Error: pushNotifications.js: Push notifications cron job call to Notification Service failed. Aborting.`, err);
                    return;
                }
            });
        });
    };
};
