# Group Users
## User [/user]
### Register a New User [POST]
Register a new user, and create a new patient for them as well.

+ Parameters
    + email (string, required)
        The email address of the new user. Validated to make sure it's a valid
        email address.
    
    + password (string, required) - the password of the new user
    + name (string, optional) - the full name of the new user

+ Request
    + Body

            {
                email: "foo@bar.com",
                password: "foobar",
                name: "Foo Bar"
            }

+ Response 201
    Errors
    + `email_required` (`400`) - no email address specified
    + `password_required` (`400`) - no password specified
    + `invalid_email` (`400`) - the email address specified is not a valid one
    + `user_already_exists` (`400`) - there is already a user with that email
    address

    + Body

            {
                email: "foo@bar.com",
                name: "Foo Bar",
                success: true
            }

### View User Info [GET]
Get basic metadata about the current user.

+ Request
    + Headers

            Authorization: Bearer ACCESS_TOKEN

+ Response 200
    Errors
    + `access_token_required` (401) - no access token specified in `Authorization`
    header
    + `invalid_access_token` (401) - the access token specified is invalid

    + Body

            {
                email: "foo@bar.com",
                name: "Foo Bar",
                success: true
            }

### Change User Info [PUT]
Change basic metadata about the current user, including their password.

+ Parameters
    + name (string, optional) - new full name
    + password (string, optional)

        New password. **Note that if the password is changed, all access tokens are revoked**.

+ Request
    + Headers

            Authorization: Bearer ACCESS_TOKEN
    + Body

            {
                name: "Foo Baz",
                password: "foobaz"
            }
+ Response 200
    Errors
    + `access_token_required` (401) - no access token specified in `Authorization`
    header
    + `invalid_access_token` (401) - the access token specified is invalid

    + Body

            {
                email: "foo@bar.com",
                name: "Foo Baz",
                success: true
            }


### Delete User [DELETE]
Permanently remove the user, including all metadata stored on them (e.g., their password).
Patients accessible only to this user will be deleted, but patients viewable by other users
will not be deleted.

+ Request
    + Headers

            Authorization: Bearer ACCESS_TOKEN

+ Response 200
    Errors
    + `access_token_required` (401) - no access token specified in `Authorization`
    header
    + `invalid_access_token` (401) - the access token specified is invalid

    + Body

            {
                email: "foo@bar.com",
                name: "Foo Bar",
                success: true
            }

