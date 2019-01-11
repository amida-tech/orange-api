"use strict";
var express         = require("express"),
    mongoose        = require("mongoose"),
    errors          = require("../errors.js").ERRORS,
    list            = require("./helpers/list.js"),
    crud            = require("./helpers/crud.js"),
    request         = require("request"),
    config          = require("../../config"),
    uuidv4          = require("uuid/v4"),
    auth = require("./helpers/auth.js"),
    authenticate    = require("./helpers/auth.js").authenticate;

const guard = auth.roleGuard;

var users = module.exports = express.Router({ mergeParams: true });

var User = mongoose.model("User");
var Patient = mongoose.model("Patient");

const makeRequest = (data, callback, method = "post") => {
  request[method](data, callback);
};

// Add UUID for users that do not already have one on their account
User.find({ "uuid" : { "$exists" : false } }, function(err, users) {
    if (err) {
        console.log("Query for users that do not have UUIDs threw this error:", err);
    } else if (users.length > 0) {
        var usersUpdated = 0;

        const loginOptions = {
            url: `${config.authServiceAPI}/auth/login`,
            body: {
                username: config.pushNotificationsServiceUserUsername,
                password: config.pushNotificationsServiceUserPassword
            },
            json: true,
            headers: {
                "Content-Type" : "application/json"
            }
        };

        request.post(loginOptions, function(err, httpResponse){
            if (err) {
                console.log("ERROR: The UUID auto-population attempt to login with the service user threw this error. Ensure the service user exists in your auth service and your PUSH_NOTIFICATIONS_SERVICE_USER_USERNAME and PUSH_NOTIFICATIONS_SERVICE_USER_PASSWORD match it.", err);
            } else if (httpResponse.statusCode !== 200 && httpResponse.statusCode !== 201) {
                console.log("The UUID auto-population attempt to login with the service user failed. Ensure the service user exists in your auth service and your PUSH_NOTIFICATIONS_SERVICE_USER_USERNAME and PUSH_NOTIFICATIONS_SERVICE_USER_PASSWORD match it.");
                console.log(errors.USER_CREATION_GENERIC_ERROR);
            }

            const getUsersOptions = {
                url: `${config.authServiceAPI}/user`,
                headers: {
                    Authorization: "Bearer " + httpResponse.body.token,
                    "Content-Type": "application/json"
                },
                json: true
            };

            request.get(getUsersOptions, function(err, httpResponse){
                if (err) {
                    console.log("ERROR: The UUID auto-population attempt to get users produced this error:", err);
                } else if (httpResponse.statusCode !== 200 && httpResponse.statusCode !== 201) {
                    console.log("The UUID auto-population attempt to get users failed");
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
                    console.log("\n\nERROR: Please run the DB migration on the auth service so that its users have UUIDs via Auth Service command `yarn migrate`\n\n");
                }
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
        organization: user.organization,
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



let maybeAuthenticate = [];
if (!config.allowPublicRegistration) {
    maybeAuthenticate = [authenticate, guard(["admin", "programAdministrator"])];
}
// Register a new user
users.post("/", ...maybeAuthenticate, function (req, res, next) {
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
        organization: req.body.organization,
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
            var reqBody = req.body;
            reqBody.username = reqBody.email;
            reqBody.scopes = [reqBody.role];
            makeRequest({
                url: `${config.authServiceAPI}/user`,
                headers: {
                    authorization: req.headers.authorization
                },
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

                if (config.pushNotificationsEnabled) {

                    //Login as microservice user on auth service
                    makeRequest({
                        url: `${config.authServiceAPI}/auth/login`,
                        body: {
                            username: config.pushNotificationsServiceUserUsername,
                            password: config.pushNotificationsServiceUserPassword
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
                                username: req.body.username,
                                uuid: potentialUser.uuid
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

//TODO Guard with helpdesk role
// users.get("/:email", authenticate, function (req, res, next) {
//   User.findOne({ email: req.body.email }, crud.returnData(res, next));
// });

// Fields we want to output in JSON response (in addition to ID)
var formatList = crud.formatListGenerator(["first_name", "last_name", "email", "role", "organization"], "users");
var returnListData = crud.returnListData;
// Get list of users
var paramParser = list.parseListParameters(["id", "first_name", "last_name"],
        ["first_name", "last_name"]);
users.get("/all", authenticate, guard(["admin", "programAdministrator", "helpDesk"]), paramParser, function (req, res, next) {
    var params = {
        limit: req.listParameters.limit,
        offset: req.listParameters.offset,
        sortBy: req.listParameters.sortBy,
        sortOrder: req.listParameters.sortOrder,
        firstName: req.listParameters.filters.first_name,
        lastName: req.listParameters.filters.last_name
    };

    // the model handles the querying for us
    return User.findByParameters({}, params, returnListData(res, next));

}, formatList);

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
          username: config.pushNotificationsServiceUserUsername,
          password: config.pushNotificationsServiceUserPassword
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

    if (typeof deviceToken !== "undefined" && config.pushNotificationsEnabled) {
      updateTokenOnNMS(deviceToken, "iOS");
    }

    if (typeof gcmToken !== "undefined" && config.pushNotificationsEnabled) {
      updateTokenOnNMS(gcmToken, "Android");
    }

    // npi is only a clinician field
    if (req.user.role === "clinician" && typeof npi !== "undefined") req.user.npi = npi;

    req.user.save(function (err) {
        if (err) return next(err);

        // successful response
        res.send(createSuccessfulUserResponse(req.user));
    });
});

users.delete("/revoke-device", authenticate, function (req, res, next) {
    const revokeDeviceOnNMS = (token, deviceType) => {
      makeRequest({
        url: `${config.authServiceAPI}/auth/login`,
        body: {
          username: config.pushNotificationsServiceUserUsername,
          password: config.pushNotificationsServiceUserPassword
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

        makeRequest({
          url: `${config.notificationServiceAPI}/users/revoke-device`,
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
          res.status(200);
          res.send({
              success: true
          });
        }, "delete");
      });
    };


    const deviceToken = req.query.deviceToken;
    const gcmToken = req.query.gcmToken;
    if (typeof deviceToken !== "undefined" && config.pushNotificationsEnabled) {
      revokeDeviceOnNMS(deviceToken, "iOS");
    }

    if (typeof gcmToken !== "undefined" && config.pushNotificationsEnabled) {
      revokeDeviceOnNMS(gcmToken, "Android");
    }
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
