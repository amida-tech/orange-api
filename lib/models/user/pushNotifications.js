"use strict";

const config  = require("../../../config.js");
const Client = require("node-rest-client").Client;
const client = new Client();

module.exports = function (UserSchema) {

    UserSchema.methods.sendPushNotification = function (payload) {
      if (!config.pushNotificationsEnabled) return;
      var user = this;

      const username = user.email;
      const data = [
        Object.assign({username, namespace: "OrangeMobile"}, payload)
      ];

      const authArgs = {
          headers: {"Content-Type": "application/json"},
          data: {
            username: config.pushNotificationsServiceUserUsername,
            password: config.pushNotificationsServiceUserPassword
          }
      };

      client.post(`${config.authServiceAPI}/auth/login`, authArgs, function (authResData, response) {
          const { token } = authResData;
          const pushNotificationArgs = {
              headers: {"Content-Type": "application/json", "Authorization":"Bearer " + token},
              data: {data, protocol: "push"}
          };
          client.post(`${config.notificationServiceAPI}/notifications/send`, pushNotificationArgs, function (notificationResData, response) {
          });
      });
    };
};
