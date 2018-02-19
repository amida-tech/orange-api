"use strict";
var jwt = require("jsonwebtoken");
var config = require("../../../config");

module.exports = {
    signJWT: function(userInfo) {
        return jwt.sign(userInfo, config.jwtSecret, { expiresIn: "1h" });
    }
};
