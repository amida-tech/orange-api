"use strict";
var express         = require("express"),
    mongoose        = require("mongoose"),
    errors          = require("../errors.js").ERRORS,
    request         = require("request"),
    config          = require("../../config"),
    authenticate    = require("./helpers/auth.js").authenticate;

var users = module.exports = express.Router({ mergeParams: true });

var User = mongoose.model("User");
var Patient = mongoose.model("Patient");

function validateEmail(email) {
    var re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(String(email).toLowerCase());
}

function createSuccessfulUserResponse(user) {
    var response = {
        email: user.email,
        first_name: user.firstName,
        last_name: user.lastName,
        phone: user.phone,
        deviceToken: user.deviceToken,
        gcmToken: user.gcmToken,
        role: user.role,
        defaultPatientID: user.defaultPatientID,
        success: true
    };
    if (user.role === "clinician") {
        response.npi = user.npi;
    }
    return response;
}

const makeRequest = (data, callback) => {
  request.post(data, callback);
};

// Register a new user
users.post("/", function (req, res, next) {
  var reqBody = req.body;
  reqBody.username = reqBody.email;

  if(!req.body.email){
    return next(errors.EMAIL_REQUIRED);
  }
  if(!validateEmail(req.body.email)){
    return next(errors.INVALID_EMAIL);
  }

  var potentialUser = {
      email: req.body.email,
      firstName: req.body.first_name,
      lastName: req.body.last_name,
      phone: req.body.phone,
      role: req.body.role
  };
  const createUser = () => {
    User.create(potentialUser, function (err, user) {
        if (err) return next(err);
        Patient.findOne({ creator: user.email, me: true }, function(err, patient){
            if (err) return next(err);

            user.defaultPatientID = patient.id;
            // successful response
            res.status(201);
            res.send(createSuccessfulUserResponse(user));
        });
    });
  };

  //Register on Auth service;
  if (process.env.NODE_ENV !== "test") {
    new User(potentialUser).validate(function(err) {
      if (err) {
        return next(err);
      }

      //Create New User on Auth Service User
      makeRequest({
        url: `${config.authServiceAPI}/user`,
        form: reqBody
      }, function(err, httpResponse){
        if (err) {
          return next(err);
        } else if (httpResponse.statusCode !== 200 && httpResponse.statusCode !== 201) {
          res.status(httpResponse.statusCode);
          return next(errors.USER_CREATION_GENERIC_ERROR);
        }

        if (config.enablePushNotifications) {
          //Login as microservice user on auth service
          makeRequest({
            url: `${config.authServiceAPI}/auth/login`,
            body: {
              username: config.microserviceAccessKey,
              password: config.microservicePassword
            },
            json: true,
            headers: {
              "Content-Type" : "application/json"
            }
          }, function(err, httpResponse){
            if (err) {
              return next(err);
            } else if (httpResponse.statusCode !== 200 && httpResponse.statusCode !== 201) {
              res.status(httpResponse.statusCode);
              return next(errors.USER_CREATION_GENERIC_ERROR);
            }

            //Create user on Notification Microservice using Microservice user Credentials
            makeRequest({
              url: `${config.notificationServiceAPI}/users`,
              form: {
                username: req.body.username
              },
              headers: {
                Authorization: "Bearer " + httpResponse.body.token,
                "Content-Type": "application/json"
              },
              json: true
            }, function(err, httpResponse){
              if (err) {
                return next(err);
              } else if (httpResponse.statusCode !== 200 && httpResponse.statusCode !== 201) {
                res.status(httpResponse.statusCode);
                return next(errors.USER_CREATION_GENERIC_ERROR);
              }

              //Create Orange User
              createUser();
            });
          });
        } else {
          //Create Orange User
          createUser();
        }
      });
    });
 } else {
   createUser();
 }
});

// Get basic user info
users.get("/", authenticate, function (req, res) {
    res.send(createSuccessfulUserResponse(req.user));
});

// Set user info
users.put("/", authenticate, function (req, res, next) {
    var firstName = req.body.first_name;
    var lastName = req.body.last_name;
    var phone = req.body.phone;
    var deviceToken = req.body.deviceToken;
    var gcmToken = req.body.gcmToken;
    var npi = req.body.npi || "";

    // allow blank names and phones
    if (typeof firstName !== "undefined") req.user.firstName = firstName;
    if (typeof lastName !== "undefined") req.user.lastName = lastName;
    if (typeof phone !== "undefined") req.user.phone = phone;

    const updateTokenOnNMS = (token, deviceType) => {
      makeRequest({
        url: `${config.authServiceAPI}/auth/login`,
        body: {
          username: config.microserviceAccessKey,
          password: config.microservicePassword
        },
        json: true,
        headers: {
          "Content-Type" : "application/json"
        }
      }, function(err, httpResponse){
        if (err) {
          return next(err);
        } else if (httpResponse.statusCode !== 200) {
          res.status(httpResponse.statusCode);
          return next(errors.UNKNOWN_ERROR);
        }

        //Create device on Notification Microservice using Microservice user Credentials
        makeRequest({
          url: `${config.notificationServiceAPI}/users/updateDevice`,
          form: {
            username: req.user.email,
            token,
            deviceType
          },
          headers: {
            Authorization: "Bearer " + httpResponse.body.token,
            "Content-Type": "application/json"
          },
          json: true
        }, function(err, httpResponse){
          if (err) {
            return next(err);
          } else if (httpResponse.statusCode !== 200) {
            res.status(httpResponse.statusCode);
            return next(errors.UNKNOWN_ERROR);
          }
        });
      });
    };

    if (typeof deviceToken !== "undefined") {
      req.user.deviceToken = deviceToken;
      if (config.enablePushNotifications) updateTokenOnNMS(deviceToken, "iOS");
    }

    if (typeof gcmToken !== "undefined") {
      req.user.gcmToken = gcmToken;
      if (config.enablePushNotifications) updateTokenOnNMS(gcmToken, "Android");
    }

    // npi is only a clinician field
    if (req.user.role === "clinician" && typeof npi !== "undefined") req.user.npi = npi;

    req.user.save(function (err) {
        if (err) return next(err);

        // successful response
        res.send(createSuccessfulUserResponse(req.user));
    });
});

// Delete user
users.delete("/", authenticate, function (req, res, next) {
    req.user.remove(function (err) {
        if (err) return next(err);

        // successful response
        res.send(createSuccessfulUserResponse(req.user));
    });
});

