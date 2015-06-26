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
            open: "09:00",
            close: "17:00"
        },
        tuesday: {
            open: "09:00",
            close: "17:00"
        },
        wednesday: {
            open: "09:00",
            close: "17:00"
        },
        thursday: {
            open: "09:00",
            close: "17:00"
        },
        friday: {
            open: "09:00",
            close: "17:00"
        },
        saturday: {
            open: "09:00",
            close: "17:00"
        },
        sunday: {
            open: "09:00",
            close: "17:00"
        }
    },
    notes: "Lorem ipsum"
});
/*eslint-enable key-spacing */
