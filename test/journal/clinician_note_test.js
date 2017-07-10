"use strict";
var chakram         = require("chakram"),
    util            = require("util"),
    curry           = require("curry"),
    Q               = require("q"),
    auth            = require("../common/auth.js"),
    patients        = require("../patients/common.js"),
    medications     = require("../medications/common.js"),
    fixtures        = require("./fixtures.js");

var expect = chakram.expect;



//Clinican Note Tests

describe("Clinican Notes", function (){


	var editNote = function (data, patientID, journalID, accessToken) {
		var url = util.format("http://localhost:5000/v1/patients/%d/journal/%d", patientID, journalID);
		return chakram.put(url, data, auth.genAuthHeaders(accessToken));
	}
	var viewNote = function (patientID, journalID, accessToken) {
		var url = util.format("http://localhost:5000/v1/patients/%d/journal/%d", patientID, journalID);
		return chakram.get(url, auth.genAuthHeaders(accessToken));
	}
	var createNote = function(data, patientID, accessToken){
		var url = util.format("http://localhost:5000/v1/patients/%d/journal/", patientID);
		return chakram.post(url, data, auth.genAuthHeaders(accessToken));
	}

	describe("testing clinician note priviliges", function () {
	    var user, clinicianUser, patient;
	    //setup clinician user
	    before(function () {
	        return auth.createTestUser({"clinician": true}).then(function (u) {
	            clinicianUser = u;

	        });

	    });
	    // setup current user and one patient for them, with a journal entry where clinician is set to true
	    before(function () {
	        return auth.createTestUser().then(function (u) {
	            user = u;
	            // create patient
	            return patients.createMyPatient({}, user).then(function (p) {
	                patient = p;
	                Q.npost(patient, "share", [clinicianUser.email, "default", "prime"]);
	            }).then(function () {
	                // setup journal entry for Patient
	                return Q.nbind(patient.createJournalEntry, patient)({
	                    text: "Clinican Note",
	                    date: (new Date()).toISOString(),
	                    clinician: true
	                });
	            });
	        });
	    });


	    it("Asserts that clinican can view clinican note", function () {
	        return expect(viewNote(patient._id, patient.entries[0]._id,clinicianUser.accessToken)).to.be.a.journal.viewSuccess;
	    });
	    it("Asserts that clinican can edit clinican note", function () {
	        var modifications = {text: "Different clinican note"};
	        return expect(editNote(modifications,patient._id, patient.entries[0]._id,clinicianUser.accessToken)).to.be.a.journal.success;
	    });
	    it("Asserts that patient user cannot view clinican note", function () {
	        return expect(viewNote(patient._id, patient.entries[0]._id, user.accessToken)).to.be.an.api.error(403, "unauthorized")
	    });
	    it("Asserts that patient user cannot edit clinican note", function () {
	        var modifications = {text: "Different clinican note"};
	        return expect(editNote(modifications,patient._id, patient.entries[0]._id, user.accessToken)).to.be.an.api.error(403, "unauthorized")
	    });
	    it("Asserts that clinican note cannot contain meditation values", function () {
	        var modifications = {meditation: true};
	        return expect(editNote(modifications, patient._id, patient.entries[0]._id, clinicianUser.accessToken)).to.be.an.api.error(400, "invalid_clinician_note");
	    });
	    it("Asserts that note created by Clincian API user is marked as a clinican note", function() {
	    	var modifications = {text: "New clinican note", date: (new Date()).toISOString()};
	    	return createNote(modifications, patient._id, clinicianUser.accessToken).then( function (response) {
	    		expect(response.body.clinician).to.deep.equal(true);
	    	})
	    });
	});
});