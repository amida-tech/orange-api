"use strict";
var chakram         = require("chakram"),
    util            = require("util"),
    curry           = require("curry"),
    auth            = require("../common/auth.js"),
    patients        = require("../patients/common.js"),
    fixtures        = require("./fixtures.js");

var expect = chakram.expect;

describe("Document Signatures", function () {
    describe("Create New Document Signature (POST /patients/:patientid/documentSignatures)", function () {
        // basic endpoint
        var create = function (data, patientId, accessToken) {
            var url = util.format("http://localhost:5000/v1/patients/%d/documentSignatures", patientId);
            return chakram.post(url, data, auth.genAuthHeaders(accessToken));
        };

        // given a patient and user nested within the patient, try and create a new
        // document signature for the patient based on the factory template
        var createDocumentSignature = function (data, patient) {
            return fixtures.build("DocumentSignature", data).then(function (documentSignature) {
                return create(documentSignature, patient._id, patient.user.accessToken);
            });
        };
        // create patient and user automatically
        var createPatientDocumentSignature = function (data) {
            return patients.testMyPatient({}).then(curry(createDocumentSignature)(data));
        };

        // check it requires a valid user and patient
        patients.itRequiresAuthentication(curry(create)({}));
        patients.itRequiresValidPatientId(curry(create)({}));
        patients.itRequiresWriteAuthorization(curry(createDocumentSignature)({}));

        it("creates document signatures", function () {
            return expect(createPatientDocumentSignature({})).to.be.a.documentSignature.createSuccess;
        });

        // validation testing
        it("requires a documentName", function () {
            return expect(createPatientDocumentSignature({ documentName: undefined })).to.be.an.api.error(400, "document_name_required");
        });
        it("does not allow a blank documentName", function () {
            return expect(createPatientDocumentSignature({ documentName: "" })).to.be.an.api.error(400, "document_name_required");
        });
        it("does not allow a null documentName", function () {
            return expect(createPatientDocumentSignature({ documentName: null })).to.be.an.api.error(400, "document_name_required");
        });

        it("requires a version", function () {
            return expect(createPatientDocumentSignature({ version: undefined })).to.be.an.api.error(400, "version_required");
        });
        it("does not allow a blank version", function () {
            return expect(createPatientDocumentSignature({ version: "" })).to.be.an.api.error(400, "version_required");
        });
        it("does not allow a null version", function () {
            return expect(createPatientDocumentSignature({ version: null })).to.be.an.api.error(400, "version_required");
        });
    });
});
