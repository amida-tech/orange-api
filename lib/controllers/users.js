"use strict";
var express         = require("express"),
    mongoose        = require("mongoose"),
    errors          = require("../errors.js").ERRORS,
    request         = require("request"),
    config          = require("../../config"),
    authenticate    = require("./helpers/auth.js").authenticate;

var users = module.exports = express.Router({ mergeParams: true });

var User = mongoose.model("User");

function validateEmail(email) {
    var re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(String(email).toLowerCase());
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
  if(!req.body.password){
    return next(errors.PASSWORD_REQUIRED);
  }
  const createUser = () => {
    User.create({
        email: req.body.email,
        password: req.body.password,
        firstName: req.body.first_name,
        lastName: req.body.last_name,
        phone: req.body.phone
    }, function (err, user) {
        if (err) return next(err);

        // successful response
        res.status(201);
        res.send({
            email: user.email,
            first_name: user.firstName,
            last_name: user.lastName,
            phone: user.phone,
            success: true
        });
    });
  };

  //Register on Auth service;
  if (process.env.NODE_ENV !== "test") {
    request.post(
      {
        url:  `${config.authServiceAPI}/user`,
        form: reqBody
      }, function(err, httpResponse, body){
        if (err) {
          return next(err);
        } else if (httpResponse.statusCode !== 200 && httpResponse.statusCode !== 201) {
          res.status(httpResponse.statusCode);
          return next(errors.USER_CREATION_GENERIC_ERROR);
        }
        createUser();
     }
   );
 } else {
   createUser();
 }
});

// Get basic user info
users.get("/", authenticate, function (req, res) {
    res.send({
        email: req.user.email,
        first_name: req.user.firstName,
        last_name: req.user.lastName,
        phone: req.user.phone,
        success: true
    });
});

// Set user info
users.put("/", authenticate, function (req, res, next) {
    var firstName = req.body.first_name;
    var lastName = req.body.last_name;
    var password = req.body.password;
    var phone = req.body.phone;

    // update password if we have a present, non-blank value
    if (typeof password !== "undefined") {
        if (password === null || password.length === 0) return next(errors.PASSWORD_REQUIRED);
        req.user.password = password;
    }

    // allow blank names and phones
    if (typeof firstName !== "undefined") req.user.firstName = firstName;
    if (typeof lastName !== "undefined") req.user.lastName = lastName;
    if (typeof phone !== "undefined") req.user.phone = phone;

    req.user.save(function (err) {
        if (err) return next(err);

        // successful response
        res.send({
            email: req.user.email,
            first_name: req.user.firstName,
            last_name: req.user.lastName,
            phone: req.user.phone,
            success: true
        });
    });
});

// Delete user
users.delete("/", authenticate, function (req, res, next) {
    req.user.remove(function (err) {
        if (err) return next(err);

        // successful response
        res.send({
            email: req.user.email,
            first_name: req.user.firstName,
            last_name: req.user.lastName,
            phone: req.user.phone,
            success: true
        });
    });
});

// Reset user password
users.post("/reset_password", function (req, res, next) {
    User.resetPassword(req.body.email, function (err) {
        if (err) return next(err);

        // successful response
        res.send({
            email: req.body.email,
            success: true
        });
    });
});
