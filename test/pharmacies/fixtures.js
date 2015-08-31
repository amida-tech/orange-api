"use strict";

var mongoose  = require("mongoose"),
    Monky     = require("../common/monky.js");

var monky = module.exports = new Monky(mongoose);

/*eslint-disable key-spacing */
monky.factory("Pharmacy", {
    name: "Pharmacy #n",
    address: "#n Medical Way, Washington, DC, 20052",
    phone: "(617) 716-6176",
    hours: {
        monday: {
            open: "09:00 am",
            close: "05:00 pm"
        },
        tuesday: {
            open: "09:00 am",
            close: "05:00 pm"
        },
        wednesday: {
            open: "09:00 am",
            close: "05:00 pm"
        },
        thursday: {
            open: "09:00 am",
            close: "05:00 pm"
        },
        friday: {
            open: "09:00 am",
            close: "05:00 pm"
        },
        saturday: {
            open: "09:00 am",
            close: "05:00 pm"
        },
        sunday: {
            open: "09:00 am",
            close: "05:00 pm"
        }
    },
    notes: "Lorem ipsum",
    loc: [50.9692224, 0.0893951]
});
/*eslint-enable key-spacing */
