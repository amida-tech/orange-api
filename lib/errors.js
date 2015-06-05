"use strict";

// Custom error class with slug stored
function APIError(slug, responseCode) {
    this.name = 'APIError';
    this.message = slug;
    this.slug = slug;
    this.responseCode = responseCode;
}
APIError.prototype = new Error();

// Custom error class containing *multiple* APIErrors
function APICombinedError(errors) {
    this.name = 'APICombinedError';
    this.errors = errors;

    // form message (required) from concatenation of individual messages
    var messages = [];
    for (var i = 0; i < errors.length; i++) {
        messages.push(errors[i].message);
    }
    this.message = messages.join(", ");

    // use maximum response code: seems to work as a good heuristic
    // 500 > 401 > 400 > 200
    this.responseCode = 0;
    for (i = 0; i < errors.length; i++) {
        if (errors[i].responseCode > this.responseCode) {
            this.responseCode = errors[i].responseCode;
        }
    }

    // store slugs
    this.slugs = [];
    for (i = 0; i < errors.length; i++) {
        this.slugs.push(errors[i].slug);
    }
}
APICombinedError.prototype = new Error();

module.exports = {
    APIError: APIError,
    APICombinedError: APICombinedError,
    // errors callback-raised from elsewhere in the app
    ERRORS: {
        // User
        EMAIL_REQUIRED: new APIError('email_required', 400),
        PASSWORD_REQUIRED: new APIError('password_required', 400),
        INVALID_EMAIL: new APIError('invalid_email', 400),
        USER_ALREADY_EXISTS: new APIError('user_already_exists', 400),

        // Authentication
        USER_NOT_FOUND: new APIError('wrong_email_password', 401),
        WRONG_PASSWORD: new APIError('wrong_email_password', 401),
        LOGIN_ATTEMPTS_EXCEEDED: new APIError('login_attempts_exceeded', 403),
        INVALID_ACCESS_TOKEN: new APIError('invalid_access_token', 401),
        ACCESS_TOKEN_REQUIRED: new APIError('access_token_required', 401),

        // Patients
        NAME_REQUIRED: new APIError('name_required', 400),
        UNAUTHORIZED: new APIError('unauthorized', 403),
        INVALID_ACCESS: new APIError('invalid_access', 400),
        INVALID_PATIENT_ID: new APIError('invalid_patient_id', 404),

        // Habits
        INVALID_WAKE: new APIError('invalid_wake', 400),
        INVALID_SLEEP: new APIError('invalid_wake', 400),
        INVALID_BREAKFAST: new APIError('invalid_wake', 400),
        INVALID_LUNCH: new APIError('invalid_wake', 400),
        INVALID_DINNER: new APIError('invalid_wake', 400),

        UNKNOWN_ERROR: new APIError('unknown_error', 500)
    }
};
