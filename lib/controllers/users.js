"use strict";
var express         = require("express"),
    mongoose        = require("mongoose"),
    errors          = require("../errors.js").ERRORS,
    request         = require("request"),
    config          = require("../../config"),
    uuidv4          = require('uuid/v4'),
    authenticate    = require("./helpers/auth.js").authenticate;

var users = module.exports = express.Router({ mergeParams: true });

var User = mongoose.model("User");
var Patient = mongoose.model("Patient");


const makeRequest = (data, callback) => {
  request.post(data, callback);
};
const getRequest = (data, callback) => {
  request.get(data, callback);
};
const deleteRequest = (data, callback) => {
  request.delete(data, callback);
};

// Add UUID for users that do not already have one on their account
User.find({ "uuid" : { "$exists" : false } }, function(err, users) {
  if (err) {
     console.log(err);
  } else if (users.length > 0) {
        var adminToken = null;
        var adminId = null;
        var usersUpdated = 0;
        const adminUser = {
            email: "orange_admin@amida.com",
            username: "orange_admin@amida.com",
            password: "Testtest1!",
            scopes: ["admin"]
        };

        // Create new user on auth service if there are users without a uuid
        makeRequest({
            url: `${config.authServiceAPI}/user`,
            form: adminUser
        }, function(err, httpResponse){
            if (err) {
                console.log(err);
            } else if (httpResponse.statusCode !== 200 && httpResponse.statusCode !== 201) {
                console.log(errors.USER_CREATION_GENERIC_ERROR);
                console.log("\n\nERROR: Please migrate auth service to include the uuid column with the following command: `node_modules/.bin/sequelize db:migrate`\n\n");
            }

            adminId = JSON.parse(httpResponse.body).id;

            // Authenticate new admin user on auth service
            makeRequest({
                url: `${config.authServiceAPI}/auth/login`,
                body: {
                    username: adminUser.username,
                    password: adminUser.password
                },
                json: true,
                headers: {
                    "Content-Type" : "application/json"
                }
            }, function(err, httpResponse){
                if (err) {
                    console.log(err);
                } else if (httpResponse.statusCode !== 200 && httpResponse.statusCode !== 201) {
                    console.log(errors.USER_CREATION_GENERIC_ERROR);
                }
                adminToken = httpResponse.body.token;

                getRequest({
                    url: `${config.authServiceAPI}/user`,
                    headers: {
                        Authorization: "Bearer " + adminToken,
                        "Content-Type": "application/json"
                    },
                    json: true
                  }, function(err, httpResponse){
                      if (err) {
                          console.log(err);
                      } else if (httpResponse.statusCode !== 200 && httpResponse.statusCode !== 201) {
                          console.log(errors.USER_CREATION_GENERIC_ERROR);
                      }
                      const userData = httpResponse.body;
                      var userArray = [];

                      userData.forEach(function(user) {
                        user.username = user.username.toLowerCase();
                        user.email = user.email.toLowerCase();
                        userArray[user.username] = user;
                      });
                      if(userData[0].uuid) {
                      users.forEach(function(t) {
                          t.email = t.email.toLowerCase();
                          if (!(t.email in userArray)) {
                            User.update({ email: t.email }, { $set: { uuid: uuidv4() } }, function(err) {
                                if (err) {
                                    console.log(err);
                                } else {
                                    usersUpdated++;
                                }
                            });
                            console.log("User with email ", t.email, " is missing from auth service");
                          } else {
                            User.update({ email: t.email }, { $set: { uuid: userArray[t.email].uuid } }, function(err) {
                                if (err) {
                                    console.log(err);
                                } else {
                                    usersUpdated++;
                                }
                            });
                          }
                      });
                    } else {
                      console.log("\n\nERROR: Please migrate auth service to include the uuid column with the following command: `node_modules/.bin/sequelize db:migrate`\n\n");
                    }

                    deleteRequest({
                      url: `${config.authServiceAPI}/user/` + adminId,
                      headers: {
                          Authorization: "Bearer " + adminToken,
                          "Content-Type": "application/json"
                      },
                      json: true
                    }, function(err, httpResponse){
                        if (err) {
                            console.log(err);
                        } else if (httpResponse.statusCode !== 204) {
                            console.log(errors.USER_CREATION_GENERIC_ERROR);
                        }
                        console.log("\nMigrated " + usersUpdated + " new uuid(s) successfully!\n");
                    });
                  });
              });
        });
    }
});



var EMAIL_REGEXP = require("../models/helpers/email.js");

function validateEmail(email) {
    return EMAIL_REGEXP.test(String(email).toLowerCase());
}


function createSuccessfulUserResponse(user) {
    var response = {
        uuid: user.uuid,
        email: user.email,
        first_name: user.firstName,
        last_name: user.lastName,
        phone: user.phone,
        deviceToken: user.deviceToken,
        gcmToken: user.gcmToken,
        role: user.role,
        avatar: user.avatar,
        defaultPatientID: user.defaultPatientID,
        success: true
    };
    if (user.role === "clinician") {
        response.npi = user.npi;
    }
    return response;
}



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
            Patient.findOne({ creator: user.email, me: true }, function(err, patient) {
                if (err) return next(err);

                if (patient) {
                    user.defaultPatientID = patient.id;
                }
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

                //Retreive UUID from new auth user, store same uuid it in mongo
                potentialUser.uuid = JSON.parse(httpResponse.body).uuid;

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

// View user avatar
users.get("/avatar(.\\w+)?", authenticate, function (req, res, next) {
    // get user avatar (or default avatar if they haven't set one yet)
    req.user.getAvatar(function (err, avatar) {
        if (err) return next(err);

        // set Content-Type header
        res.header("Content-Type", req.user.avatarType.mime);

        // avatar is a stream containing the image data we can pipe straight to response
        avatar.pipe(res);
    });
});

// set user avatar
users.post("/base64Avatar", authenticate, function (req, res, next) {
    req.user.setAvatar(req, function (err) {
        if (err) return next(err);

        // send link to new avatar URL
        res.status(201);
        res.send({
            avatar: req.user.avatar,
            success: true
        });
    });
});
// set user avatar
users.post("/avatar(.\\w+)?", authenticate, function (req, res, next) {
    req.user.setAvatar(req, function (err) {
        if (err) return next(err);

        // send link to new avatar URL
        res.status(201);
        res.send({
            avatar: req.user.avatar,
            success: true
        });
    });
});

// View another users avatar
// we only return the avatar if the requested user also has access to a patient that the current user has access to
users.get("/:email/avatar(.\\w+)?", authenticate, function (req, res, next) {
    // get patients current user has access to
    Patient.findForUser({}, req.user, function (err, patients, count) {
        if (err) return next(err);

        // get shares of those patients
        const listOfShareLists = patients.map(p => p.shares);
        const listOfAllShares = listOfShareLists.reduce((allShares, shareList) => allShares.concat(shareList), []);

        // if requested email is in that list
        const userExists = listOfAllShares.reduce((exists, share) => exists || share.email === req.params.email, false);
        if (userExists) {
            // get user associated with requested email
            User.findOne({ email: req.params.email }, function (err, user) {
                if (err) return next(err);

                // get user avatar (or default avatar if they haven't set one yet)
                user.getAvatar(function (err, avatar) {
                    if (err) return next(err);

                    // set Content-Type header
                    res.header("Content-Type", user.avatarType.mime);

                    // avatar is a stream containing the image data we can pipe straight to response
                    avatar.pipe(res);
                });
            });
        } else {
            res.status(404);
            res.send();
        }
    });
});
