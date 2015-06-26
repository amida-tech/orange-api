// As per README matches the HH:MM format specified in ISO 8601
module.exports.TIME_REGEXP = /^(0[0-9]|1[0-9]|2[0-3]):([0-5][0-9])$/;

// From http://stackoverflow.com/questions/4766845
// Match YYYY-MM-DD only
/*eslint-disable max-len */
module.exports.DATE_ONLY_REGEXP = new RegExp("^(?:(?:(?:(?:(?:[13579][26]|[2468][048])00)|(?:[0-9]{2}(?:(?:[13579][26])|(?:[2468][048]|0[48]))))-(?:(?:(?:09|04|06|11)-(?:0[1-9]|1[0-9]|2[0-9]|30))|(?:(?:01|03|05|07|08|10|12)-(?:0[1-9]|1[0-9]|2[0-9]|3[01]))|(?:02-(?:0[1-9]|1[0-9]|2[0-9]))))|(?:[0-9]{4}-(?:(?:(?:09|04|06|11)-(?:0[1-9]|1[0-9]|2[0-9]|30))|(?:(?:01|03|05|07|08|10|12)-(?:0[1-9]|1[0-9]|2[0-9]|3[01]))|(?:02-(?:[01][0-9]|2[0-8])))))$");
/*eslint-enable max-len */

// ISO 8601 data format
module.exports.DATE_FORMAT = "YYYY-MM-DDTHH:mm:ss.SSSZ";
