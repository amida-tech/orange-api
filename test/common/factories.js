"use strict";

var util = require("util");

var factories = module.exports = {};

// generate unique emails
var emailCounter = 0;
factories.email = function () {
    emailCounter++;
    return util.format("foo%d@bar.com", emailCounter);
};
factories.invalidEmail = function () {
    emailCounter++;
    return util.format("foo%dnbaracom", emailCounter);
};

// incrementing passwords
var passwordCounter = 0;
factories.password = function () {
    passwordCounter++;
    return util.format("password%d", passwordCounter);
};

// fixed name, phone, etc
factories.name = function () {
    return "Foo Bar";
}
factories.phone = function () {
    return "(617) 617-6177";
}
factories.invalidPhone = function () {
    return "foobar";
}
factories.address = function () {
    return "1 Main Street, Cambridge, MA, 02139";
}

// access tokens
factories.invalidAccessToken = function () {
    return "notanaccesstoken";
}


// different user types
factories.user = function () {
    return {
        email: factories.email(),
        name: factories.name(),
        password: factories.password()
    };
};
factories.minimumUser = function () {
    return {
        email: factories.email(),
        password: factories.password()
    };
};

// patients
factories.patient = function () {
    return {
        name: factories.name()
    };
}

// doctors
factories.doctor = function () {
    return {
        name: factories.name(),
        phone: factories.phone(),
        address: factories.address()
    };
}

// pharmacies
factories.hour = function () {
    var h = Math.floor(Math.random() * 24);
    if (h < 10)
        return "0" + h.toString();
    else
        return h.toString();
};
factories.minute = function () {
    var m = Math.floor(Math.random() * 59);
    if (m < 10)
        return "0" + m.toString();
    else
        return m.toString();
};
factories.time = function () {
    return util.format("%s:%s", factories.hour(), factories.minute());
};
factories.hourDict = function () {
    return {
        open: factories.time(),
        close: factories.time()
    };
};
factories.hours = function () {
    return {
        monday: factories.hourDict(),
        tuesday: factories.hourDict(),
        wednesday: factories.hourDict(),
        thursday: factories.hourDict(),
        friday: factories.hourDict(),
        saturday: factories.hourDict(),
        sunday: factories.hourDict()
    };
};
factories.partialHours = function () {
    return {
        monday: factories.hourDict(),
        sunday: factories.hourDict()
    };
};
factories.invalidHours = function () {
    return {
        monday: factories.hourDict(),
        tuesday: factories.hourDict(),
        wednesday: {open: "foobar", close: "baz"},
        thursday: factories.hourDict(),
        friday: factories.hourDict(),
        saturday: factories.hourDict(),
        sunday: factories.hourDict()
    };
};
factories.pharmacy = function () {
    return {
        name: factories.name(),
        phone: factories.phone(),
        address: factories.address(),
        hours: factories.hours()
    };
};

// medications
factories.rxNorm = factories.ndc = factories.rxNumber = function () {
    return "idtypevalue";
};
factories.dose = function () {
    return {
        quantity: Math.floor(Math.random()*1000),
        unit: "mg"
    };
};
factories.form = function () {
    return "pill";
};
factories.quantity = function () {
    return Math.floor(Math.random()*50);
};
factories.type = function () {
    return "otc";
};
// TODO: more schedules
factories.schedule = function () {
    return {
        type: "as_needed"
    };
};
factories.route = function () {
    return "oral";
};
factories.medication = function (doctorId, pharmacyId) {
    var med = {
        name: factories.name(),
        rx_norm: factories.rxNorm(),
        ndc: factories.ndc(),
        dose: factories.dose(),
        route: factories.route(),
        form: factories.form(),
        rx_number: factories.rxNumber(),
        quantity: factories.quantity(),
        type: factories.type(),
        schedule: factories.schedule()
    };
    // we want these to correspond to real doctors/pharmacies, so pass in IDs
    if (typeof doctorId !== "undefined") med.doctor_id = doctorId;
    if (typeof pharmacyId !== "undefined") med.pharmacy_id = pharmacyId;
    return med;
};
