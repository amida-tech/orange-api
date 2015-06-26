"use strict";
var mongoose    = require("mongoose"),
    async       = require("async"),
    errors      = require("../../errors.js").ERRORS;

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
                async.series([resource.validate, this.validate, resource.save], function (err) {
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

    // remove a single child resource
    function remove (collectionName, invalidResourceId) {
        return function (id, done) {
            // first find the resource
            find(collectionName, invalidResourceId).bind(this)(id, function (err, resource) {
                if (err) return done(err);

                // remove, and then save the patient to persist that
                resource.remove();
                this.save(function (err) {
                    if (err) return done(err);
                    // return the resource, not the patient
                    done(null, resource);
                });
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
};
