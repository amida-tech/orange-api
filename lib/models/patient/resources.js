"use strict";
var mongoose        = require("mongoose"),
    async           = require("async"),
    list            = require("../helpers/list.js"),
    errors          = require("../../errors.js").ERRORS;

// schemas to nest of child resources (e.g., doctors, pharmacies)
var DoctorSchema        = require("../doctor.js"),
    PharmacySchema      = require("../pharmacy.js"),
    MedicationSchema    = require("../medication.js"),
    JournalEntrySchema  = require("../journal_entry.js"),
    DoseSchema          = require("../dose.js");

module.exports = function (PatientSchema) {
    // don't actually store anything in these models (instead use children collections on the patient),
    // but instead use for validation (mongoose validation of embedded documents is buggy otherwise)
    var Pharmacy        = mongoose.model("Pharmacy", PharmacySchema),
        Doctor          = mongoose.model("Doctor", DoctorSchema),
        Medication      = mongoose.model("Medication", MedicationSchema),
        JournalEntry    = mongoose.model("JournalEntry", JournalEntrySchema),
        Dose            = mongoose.model("Dose", DoseSchema);

    // we do everything below for generic, abstract 'resources' and then specialise these to
    // Pharmacy/Doctor/Medication/Journal to dry things up

    // create a child resource
    function create (collectionName, Model) {
        return function (data, done) {
            // instantiate an instance of the resource model from the raw data, so we can
            // validate it (this.pharmacies.create etc has serious issues as of writing)
            var resource = new Model({});

            // may do some pre-cast validation for us (e.g., with dates) and return an error
            // set creator as current user in case that's needed
            var preError = resource.setData(data, this.habits);
            if (preError) return done(preError);

            async.series([resource.validate, this.validate], function(err) {
                if (err) return done(err);

                // add to patient's array of resources, and make double-sure mongoose knows
                this[collectionName].push(resource);
                this.markModified(collectionName);

                this.save(function (err, patient) {
                    if (err) return done(err);

                    // return the newly saved resource that's had save hooks run on
                    find(collectionName).bind(patient)(resource._id, done);
                });
            }.bind(this));
        };
    }
    PatientSchema.methods.createDoctor = create("doctors", Doctor);
    PatientSchema.methods.createPharmacy = create("pharmacies", Pharmacy);
    PatientSchema.methods.createMedication = create("medications", Medication);
    PatientSchema.methods.createJournalEntry = create("entries", JournalEntry);
    PatientSchema.methods.createDose = create("doses", Dose);

    // view a single child resource
    function find (collectionName, invalidResourceId) {
        return function (id, done) {
            var resource = this[collectionName].id(id);

            if (!resource) return done(invalidResourceId); // no resource found
            done(null, resource);
        };
    }
    PatientSchema.methods.findDoctorById = find("doctors", errors.INVALID_DOCTOR_ID);
    PatientSchema.methods.findPharmacyById = find("pharmacies", errors.INVALID_PHARMACY_ID);
    PatientSchema.methods.findMedicationById = find("medications", errors.INVALID_MEDICATION_ID);
    PatientSchema.methods.findJournalEntryById = find("entries", errors.INVALID_JOURNAL_ID);
    PatientSchema.methods.findDoseById = find("doses", errors.INVALID_DOSE_ID);

    // query for lots of child resources
    function query (collectionName, Model, filters, sorters) {
        return function (params, user, patient, done) {
            return list.query(this[collectionName], params, Model, filters, sorters, user, patient, done);
        };
    }
    PatientSchema.methods.queryDoctors = query("doctors", Doctor, {}, {});
    PatientSchema.methods.queryPharmacies = query("pharmacies", Pharmacy, {}, {});
    PatientSchema.methods.queryMedications = query("medications", Medication, {
        // only show medications the user has access to (at a medication level as well
        // as at a patient level)
        default: function (medication, user, patient) {
            return medication.authorize("read", user, patient) === null;
        }
    }, {});
    PatientSchema.methods.queryDoses = query("doses", Dose, {
        // only show doses the user has access to the medication for (at a medication level
        // as well as at a patient level)
        default: function (dose, user, patient) {
            var med = patient.medications.id(dose.medicationId);
            return med.authorize("read", user, patient) === null;
        }
    }, {});
    PatientSchema.methods.queryJournalEntries = query("entries", JournalEntry, {
        // only show journal entries the user has access to all of the medications for
        // (at a medication level as well as at a patient level)
        default: function (entry, user, patient) {
            return entry.medicationIds.every(function (medId) {
                var med = patient.medications.id(medId);
                return med.authorize("read", user, patient) === null;
            });
        }
    }, {});

    // update a single child resource
    function update (collectionName, invalidResourceId) {
        return function (id, data, done) {
            find(collectionName, invalidResourceId).bind(this)(id, function (err, resource) {
                if (err) return done(err);

                // let the model handle setting the new data
                // may do some pre-cast validation for us (e.g., with dates) and return an error
                var preError = resource.setData(data, this.habits);
                if (preError) return done(preError);

                // validate and save
                // here mongoose allows us to save the resource, not the whole patient
                async.series([resource.validate, this.validate, resource.save, this.save], function (err) {
                    // this explicit function is required because save only passes err into the callback
                    if (err) return done(err);
                    done(null, resource);
                });
            }.bind(this));
        };
    }
    PatientSchema.methods.findDoctorByIdAndUpdate = update("doctors", errors.INVALID_DOCTOR_ID);
    PatientSchema.methods.findPharmacyByIdAndUpdate = update("pharmacies", errors.INVALID_PHARMACY_ID);
    PatientSchema.methods.findMedicationByIdAndUpdate = update("medications", errors.INVALID_MEDICATION_ID);
    PatientSchema.methods.findJournalEntryByIdAndUpdate = update("entries", errors.INVALID_JOURNAL_ID);
    PatientSchema.methods.findDoseByIdAndUpdate = update("doses", errors.INVALID_DOSE_ID);

    // remove a single child resource with an optional pre remove hook
    var removeHooks = {};
    function remove (collectionName, invalidResourceId) {
        return function (id, done) {
            // first find the resource
            find(collectionName, invalidResourceId).bind(this)(id, function (err, resource) {
                if (err) return done(err);

                var runSave = function (cb) {
                    // remove, and then save the patient to persist that
                    resource.remove();
                    this.save(function (err) {
                        if (err) return cb(err);
                        // return the resource, not the patient
                        cb(null, resource);
                    });
                }.bind(this);

                // if we have a pre remove hook, run that first
                if (typeof removeHooks[collectionName] === "function") {
                    removeHooks[collectionName](this, resource, function (err) {
                        if (err) return done(err);
                        runSave(done);
                    });
                } else {
                    runSave(done);
                }
            }.bind(this));
        };
    }
    PatientSchema.methods.findDoctorByIdAndDelete = remove("doctors", errors.INVALID_DOCTOR_ID);
    PatientSchema.methods.findPharmacyByIdAndDelete = remove("pharmacies", errors.INVALID_PHARMACY_ID);
    PatientSchema.methods.findMedicationByIdAndDelete = remove("medications", errors.INVALID_MEDICATION_ID);
    PatientSchema.methods.findJournalEntryByIdAndDelete = remove("entries", errors.INVALID_JOURNAL_ID);
    PatientSchema.methods.findDoseByIdAndDelete = remove("doses", errors.INVALID_DOSE_ID);

    // Check all dose medicationIds correspond to medications owned by the patient
    // We need access to the patient, so this validation has to be done here as opposed to in
    // dose.js
    PatientSchema.path("doses").validate(function (doses) {
        // loop over all doses and check they're all valid medications
        // belonging to this patient
        return doses.every(function (dose) {
            var medication = this.medications.id(dose.medicationId);
            return !!medication; // require medication to exist
        }.bind(this));
    }, "INVALID_RESOURCE_MEDICATION_ID");

    // Similarly check all doctorIds and pharmacyIds in all medications correspond to doctors
    // and pharmacies belonging to this patient
    PatientSchema.path("medications").validate(function (medications) {
        return medications.every(function (medication) {
            // don't require doctorId
            if (typeof medication.doctorId === "undefined" || medication.doctorId === null) return true;

            var doctor = this.doctors.id(medication.doctorId);
            return !!doctor; // require doctor to exist
        }.bind(this));
    }, "INVALID_RESOURCE_DOCTOR_ID");
    PatientSchema.path("medications").validate(function (medications) {
        return medications.every(function (medication) {
            // don't require pharmacyId
            if (typeof medication.pharmacyId === "undefined" || medication.pharmacyId === null) return true;

            var pharmacy = this.pharmacies.id(medication.pharmacyId);
            return !!pharmacy; // require pharmacy to exist
        }.bind(this));
    }, "INVALID_RESOURCE_PHARMACY_ID");

    // Similarly check all ids in medicationIds in all journal entries belonging to this patient
    PatientSchema.path("entries").validate(function (entries) {
        return entries.every(function (entry) {
            // don't require any medication IDs
            if (typeof entry.medicationIds === "undefined" || entry.medicationIds === null) return true;

            return entry.medicationIds.every(function (medicationId) {
                var medication = this.medications.id(medicationId);
                return !!medication; // require medication to exist
            }.bind(this));
        }.bind(this));
    }, "INVALID_RESOURCE_MEDICATION_ID");

    // Similarly check any `scheduled` key on a dose object corresponds to a valid scheduled event time
    // in the corresponding medication object
    PatientSchema.path("doses").validate(function (doses) {
        // loop over all doses
        return doses.every(function (dose) {
            // don't require a `scheduled` value
            if (typeof dose.scheduled === "undefined" || dose.scheduled === null) return true;

            // get the medication corresponding to the dose
            var medication = this.medications.id(dose.medicationId);
            // we validate this exists elsewhere, so for now if it doesn't exist we validate
            // the `scheduled` key as true
            // we also do this if the medication is not a recurring scheduled one
            if (!medication || !medication.schedule.times) return true;

            // get a list of scheduled medication event time IDs
            var timeIds = medication.scheduleFor(dose).times.map(function (time) {
                return time._id;
            });

            // our scheduled value should be in there
            return timeIds.indexOf(dose.scheduled) >= 0;
        }.bind(this));
    }, "INVALID_SCHEDULED");

    // for a similar reason we cascade deletes in here as opposed to individual model files
    // mongoose is buggy, doesn't scale and undocumented, so we have to do things this slightly hackish way

    // when removing a doctor, set the doctorId field to null on any medications
    // for the doctor (*not* remove the medication)
    removeHooks.doctors = function (patient, doctor, callback) {
        mongoose.model("Patient").update({
            _id: patient._id,
            "medications.doctorId": doctor._id
        }, {
            "$set": { "medications.$.doctorId": null }
        }, callback);
    };
    // and likewise for pharmacies and pharmacyId on medications
    removeHooks.pharmacies = function (patient, pharmacy, callback) {
        mongoose.model("Patient").update({
            _id: patient._id,
            "medications.pharmacyId": pharmacy._id
        }, {
            "$set": { "medications.$.pharmacyId": null }
        }, callback);
    };

    // when deleting a medication, delete all associated doses and journal entries
    removeHooks.medications = function (patient, medication, callback) {
        mongoose.model("Patient").update({
            _id: patient._id
        }, {
            "$pull": {
                doses: { medicationId: medication._id },
                entries: { medicationId: medication._id }
            }
        }, callback);
    };

    // create (and update) journal entries for doses on save
    // (notes on doses should be returned by the /journal endpoints)
    PatientSchema.pre("save", function (next) {
        var patient = this;

        // for each dose
        if (this.doses.length === 0) return next();
        async.each(this.doses, function (dose, callback) {
            // if a note is present on the dose
            var notePresent = (typeof dose.notes === "string") && (dose.notes.length > 0);
            // if a journal entry currently exists for the dose
            var entryExists = (typeof dose.entryId === "number");

            var entry;
            if (notePresent && !entryExists) {
                // create journal entry
                entry = new JournalEntry();
                entry.text = dose.notes;
                entry.doseId = dose._id;
                var preError = entry.setData({
                    date: dose.date,
                    medication_ids: [dose.medicationId]
                });
                if (preError) return callback(preError);
                // validate assigns entry an ID
                entry.validate(function (err) {
                    if (err) return callback(err);
                    // add to list of entries to be saved
                    patient.entries.push(entry);
                    patient.markModified("entries");
                    // store ID of entry
                    dose.entryId = entry._id;
                    patient.markModified("doses");
                    return callback();
                });
            } else if (notePresent && entryExists) {
                // update entry
                entry = patient.entries.id(dose.entryId);
                if (typeof entry !== "undefined" && entry !== null) {
                    // see if journal entry text has been explicitly modified, in which case
                    // we update the dose instead
                    if (entry.changed === true) {
                        dose.notes = entry.text;
                        patient.markModified("doses");
                        entry.changed = false;
                    } else {
                        entry.text = dose.notes;
                    }

                    entry.doseId = dose._id;
                    patient.markModified("entries");
                }
                return callback();
            } else if (!notePresent && entryExists) {
                // remove entry
                entry = patient.entries.id(dose.entryId);
                if (typeof entry !== "undefined" && entry !== null) {
                    entry.remove();
                    patient.markModified("entries");
                }
                // remove stored entry ID
                dose.entryId = null;
                patient.markModified("doses");
                return callback();
            } else {
                // no note present and no entry exists
                // nothing to do
                return callback();
            }
        }, next);
    });

    // when deleting a dose, delete any associated journal entry
    removeHooks.doses = function (patient, dose, callback) {
        var entryId = dose.entryId;
        if (typeof entryId !== "number") return callback();

        // remove entry
        mongoose.model("Patient").update({
            _id: patient._id
        }, {
            "$pull": {
                entries: { _id: entryId }
            }
        }, callback);
    };

    // when deleting a journal entry, set the notes to be blank on any associated dose
    removeHooks.entries = function (patient, entry, callback) {
        var doseId = entry.doseId;
        if (typeof doseId !== "number") return callback();

        // set notes to be blank
        var dose = patient.doses.id(doseId);
        if (typeof dose === "undefined" || dose === null) return callback();
        dose.notes = "";
        patient.markModified("doses");
        patient.markModified("entries");

        return callback();
    };
};
