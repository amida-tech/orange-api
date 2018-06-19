"use strict";

// Custom error class with slug and HTTP response code stored
// Should correspond exactly to the errors we show in the errors field in API responses
function APIError(slug, responseCode, message) {
    // capture stack trace
    Error.call(this);
    Error.captureStackTrace(this, this.constructor);
    if (message) {
      this.message = message;
    }
    this.name = "APIError";
    //this.message = slug;
    this.status = "ERROR";
    this.code = slug.toUpperCase();
    this.responseCode = responseCode;
}
APIError.prototype = new Error();

// Custom error class containing *multiple* APIErrors (one errors: [] array in an API response)
function APICombinedError(errors) {
    this.name = "APICombinedError";
    // unique: don't show duplicate errors
    this.errors = errors.filter(function (el, i) {
        return errors.indexOf(el) === i;
    });

    // form message (required) from concatenation of individual messages
    var messages = [];
    for (var i = 0; i < this.errors.length; i++) {
        messages.push(this.errors[i].message);
    }
    this.message = messages.join(", ");

    // use mathemtically maximum response code: seems to work as a good heuristic
    // 500 > 403 > 401 > 400 > 200
    this.responseCode = 0;
    for (i = 0; i < this.errors.length; i++) {
        if (this.errors[i].responseCode > this.responseCode) {
            this.responseCode = this.errors[i].responseCode;
        }
    }

    // store slugs
    this.slugs = [];
    for (i = 0; i < this.errors.length; i++) {
        this.slugs.push(this.errors[i].slug);
    }
}
APICombinedError.prototype = new Error();

module.exports = {
    APIError: APIError,
    APICombinedError: APICombinedError,
    // errors callback-raised from elsewhere in the app
    ERRORS: {
        // Client secret (API-wide authentication)
        INVALID_CLIENT_SECRET: new APIError("invalid_client_secret", 401),

        // User
        EMAIL_REQUIRED: new APIError("email_required", 400, "Email address must be added to the request."),
        PASSWORD_REQUIRED: new APIError("password_required", 400),
        INVALID_EMAIL: new APIError("invalid_email", 400),
        INVALID_ROLE: new APIError("invalid_role", 400),
        INVALID_NPI: new APIError("invalid_npi", 400),
        USER_ALREADY_EXISTS: new APIError("user_already_exists", 400),
        USER_NOT_REGISTERED: new APIError("not_registered", 400),
        USER_CREATION_GENERIC_ERROR: new APIError("user_creation_generic_error", 400),

        // Authentication
        USER_NOT_FOUND: new APIError("wrong_email_password", 401),
        WRONG_PASSWORD: new APIError("wrong_email_password", 401),
        LOGIN_ATTEMPTS_EXCEEDED: new APIError("login_attempts_exceeded", 403),
        INVALID_ACCESS_TOKEN: new APIError("invalid_access_token", 401),
        ACCESS_TOKEN_REQUIRED: new APIError("access_token_required", 401),

        // Resetting password
        USER_NOT_FOUND_FOR_RESET: new APIError("user_not_found", 400),

        // Patients
        FIRST_NAME_REQUIRED: new APIError("first_name_required", 400),
        INVALID_SEX: new APIError("invalid_sex", 400),
        INVALID_BIRTHDATE: new APIError("invalid_birthdate", 400),
        UNAUTHORIZED: new APIError("unauthorized", 403),
        INVALID_ACCESS: new APIError("invalid_access", 400),
        ACCESS_REQUIRED: new APIError("invalid_access", 400),
        INVALID_GROUP: new APIError("invalid_group", 400),
        GROUP_REQUIRED: new APIError("invalid_group", 400),
        INVALID_PATIENT_ID: new APIError("invalid_patient_id", 404),
        INVALID_SHARE_ID: new APIError("invalid_share_id", 404),
        IS_OWNER: new APIError("is_owner", 400),

        // List parameters
        INVALID_LIMIT: new APIError("invalid_limit", 400),
        INVALID_OFFSET: new APIError("invalid_offset", 400),
        INVALID_SORT_BY: new APIError("invalid_sort_by", 400),
        INVALID_SORT_ORDER: new APIError("invalid_sort_order", 400),
        INVALID_IS_USER: new APIError("invalid_is_user", 400),

        // Doctors
        INVALID_DOCTOR_ID: new APIError("invalid_doctor_id", 404),
        NAME_REQUIRED: new APIError("name_required", 400),

        // Pharmacies
        INVALID_PHARMACY_ID: new APIError("invalid_pharmacy_id", 404),
        INVALID_HOURS: new APIError("invalid_hours", 400),

        // Medications
        INVALID_MEDICATION_ID: new APIError("invalid_medication_id", 404),
        INVALID_QUANTITY: new APIError("invalid_quantity", 400),
        INVALID_DOSE: new APIError("invalid_dose", 400),
        INVALID_SCHEDULE: new APIError("invalid_schedule", 400),
        INVALID_FILL_DATE: new APIError("invalid_fill_date", 400),
        INVALID_IMPORT_ID: new APIError("invalid_import_id", 400),

        // Journal entries
        INVALID_JOURNAL_ID: new APIError("invalid_journal_id", 404),
        DATE_REQUIRED: new APIError("date_required", 400),
        TEXT_REQUIRED: new APIError("text_required", 400),
        INVALID_DATE: new APIError("invalid_date", 400),
        INVALID_EMOJI: new APIError("invalid_emoji", 400),
        MEDITATION_REQUIRED: new APIError("meditation_required", 400),
        INVALID_MEDITATION_VALUE: new APIError("invalid_meditation_value", 400),
        MEDITATIONLENGTH_NULL: new APIError("meditation_length_null", 400),
        MEDITATIONLENGTH_ZERO: new APIError("meditation_length_zero", 400),
        INVALID_MEDITATION_LENGTH: new APIError("invalid_meditation_length", 400),
        INVALID_CLINICIAN_NOTE: new APIError("invalid_clinician_note", 400),
        INVALID_SIDEEFFECT: new APIError("invalid_sideeffect", 400),
        INVALID_MOOD: new APIError("invalid_mood", 400),
        INVALID_ACTIVITY: new APIError("invalid_activity", 400),

        // Habits
        INVALID_WAKE: new APIError("invalid_wake", 400),
        INVALID_SLEEP: new APIError("invalid_sleep", 400),
        INVALID_BREAKFAST: new APIError("invalid_breakfast", 400),
        INVALID_LUNCH: new APIError("invalid_lunch", 400),
        INVALID_DINNER: new APIError("invalid_dinner", 400),
        INVALID_TZ: new APIError("invalid_tz", 400),
        INVALID_ACCESS_ANYONE: new APIError("invalid_access_anyone", 400),
        INVALID_ACCESS_FAMILY: new APIError("invalid_access_family", 400),
        INVALID_ACCESS_PRIME: new APIError("invalid_access_prime", 400),

        // Adherence events (doses)
        INVALID_DOSE_ID: new APIError("invalid_dose_id", 404),
        INVALID_TAKEN: new APIError("invalid_taken", 400),
        TAKEN_REQUIRED: new APIError("taken_required", 400),
        INVALID_SCHEDULED: new APIError("invalid_scheduled", 400),

        // Schedule
        INVALID_START_DATE: new APIError("invalid_start", 400),
        INVALID_END_DATE: new APIError("invalid_end", 400),

        // Should never get thrown by design
        UNKNOWN_ERROR: new APIError("unknown_error", 500),
        // e.g., medication_id parameter in POST /adherences
        // gives 400 as opposed to 404
        INVALID_RESOURCE_MEDICATION_ID: new APIError("invalid_medication_id", 400),
        INVALID_RESOURCE_DOCTOR_ID: new APIError("invalid_doctor_id", 400),
        INVALID_RESOURCE_PHARMACY_ID: new APIError("invalid_pharmacy_id", 400),

        // Avators
        INVALID_IMAGE: new APIError("invalid_image", 400),

        // Requests
        ALREADY_REQUESTED: new APIError("already_requested", 400),
        CANT_REQUEST_YOURSELF: new APIError("cant_request_yourself", 400),
        INVALID_REQUEST_ID: new APIError("invalid_request_id", 404),
        INVALID_STATUS: new APIError("invalid_status", 400),

        // Times (for notification settings)
        INVALID_TIME_ID: new APIError("invalid_time_id", 404),
        INVALID_DEFAULT: new APIError("invalid_default", 400),
        INVALID_USER: new APIError("invalid_user", 400),

        // External APIs
        BLOOM_ERROR: new APIError("bloom_error", 500),
        RXNORM_ERROR: new APIError("rxnorm_error", 500),

        // Events
        INVALID_EVENT_ID: new APIError("invalid_event_id", 400),

        // Invalid fields and
        INVALID_SUBMISSION: new APIError("invalid_submission", 400)
    }
};
