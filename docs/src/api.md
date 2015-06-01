FORMAT: 1A
HOST: http://orange.amida-tech.com

# Orange API

Orange is a medication adherence app. This is a quasi-REST API for the Orange
backend, primarily allowing sharing between patients and caregivers.

All API endpoints must be prefixed with a version number: for example,
`/v1/auth/token` not just `/auth/token`. Currently `v1` is the only API version.

All data should be sent JSON-encoded, and all responses are returned in JSON.

### Response Status Codes
#### Success
All successful requests return responses with the following error codes:
 - `GET`, `PUT` and `DELETE` return `200` on success
 - `POST` returns `201` on success

#### Error
Error responses have [standard HTTP error codes](http://www.restapitutorial.com/httpstatuscodes.html),
along with an array of machine-readable error slugs in the `errors` key of the JSON response.

For example, when attempting to access user details without authentication

    Status: 401 Access denied

<!-- seperate -->

    {
        success: false,
        errors: ['wrong_email_password']
    }

If an unknown error occurs, the response code will be `500` and `errors` will
contain the `unknown_error` key.


