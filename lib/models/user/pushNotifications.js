"use strict";

const config  = require("../../../config.js");
const Client = require("node-rest-client").Client;
const client = new Client();

module.exports = function (UserSchema) {

    UserSchema.methods.sendPushNotification = function (payload) {
      if (!config.pushNotificationsEnabled) return;
      var user = this;

      const username = user.email;
      const pushData = [
        Object.assign({username}, payload)
      ];

      const authArgs = {
          headers: {"Content-Type": "application/json"},
          data: {
            username: config.pushNotificationsServiceUserUsername,
            password: config.pushNotificationsServiceUserPassword
          }
      };

      client.post(`${config.authServiceAPI}/auth/login`, authArgs, function (data, response) {
          const { token } = data;
          const pushNotificationArgs = {
              headers: {"Content-Type": "application/json", "Authorization":"Bearer " + token},
              data: {pushData}
          };
          client.post(`${config.notificationServiceAPI}/notifications/sendPushNotifications`, pushNotificationArgs, function (data, response) {
          });
      });
    };
};
