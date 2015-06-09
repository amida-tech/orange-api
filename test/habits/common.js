var util = require("util");

module.exports.endpoint = function (patientId) {
    return function () {
        // patientId may be a getter function
        if (!!(patientId && patientId.constructor && patientId.call && patientId.apply)) patientId = patientId();
        return util.format("/patients/%s/habits", patientId);
    };
};
