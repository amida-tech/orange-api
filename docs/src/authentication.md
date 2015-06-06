# Group Authentication
Orange API uses access token authentication, like many REST services and similar
to (and in fact a semi-compatible subset of) OAuth2. First you use stored
user credentials (see `POST /auth/token` below) to generate an access token,
and then pass this access token into the `Authorization` header of all other
requests. All requests apart from user registration and token generation
need this authentication.

Precisely, the access token should be sent in the `Authorization` header in the
form

            Authorization: Bearer ACCESS_TOKEN

and should be sent in plaintext, _not_ base64 encoded.


## Access Tokens [/auth/token]
### Retrieve an Access Token [POST]
Use an email/password of an existing user to generate an access token. **The
access token does not expire until the user changes password.**

+ Parameters
    + email (string, required) - the email address of the user
    + password (string, required) - the corresponding password

+ Request
    + Body

            {
                email: "foo@bar.com",
                password: "foobar"
            }

+ Response 201
    Errors
    + `email_required` (400) - no email address specified
    + `password_required` (400) - no password specified
    + `wrong_email_password` (401) - wrong email address/password combination
    + `login_attempts_exceeded` (403) - there have been too many incorrect email

    + Body

            {
                access_token: "abcdefgh123456789",
                success: true
            }


