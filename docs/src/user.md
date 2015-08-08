# Group Users
## User [/user]
### Register a New User [POST]
Register a new user, and create a new patient for them as well.

+ Parameters
    + email (string, required)
        The email address of the new user. Validated to make sure it's a valid
        email address.
    
    + password (string, required) - the password of the new user
    + first_name (string, optional) - the first name of the new user
    + last_name (string, optional) - the last name of the new user
    + phone (string, optional) - the phone number of the new user

+ Request
    + Body

            {
                email: "foo@bar.com",
                password: "foobar",
                first_name: "Foo",
                last_name: "Bar",
                phone: "6177140000"
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
                first_name: "Foo",
                last_name: "Bar",
                phone: "6177140000",
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
                first_name: "Foo",
                last_name: "Bar",
                phone: "6177140000",
                success: true
            }

### Change User Info [PUT]
Change basic metadata about the current user, including their password.

+ Parameters
    + first_name (string, optional) - new first name
    + last_name (string, optional) - new last name
    + phone (string, optional) - new phone number
    + password (string, optional)

        New password. **Note that if the password is changed, all access tokens are revoked**.

+ Request
    + Headers

            Authorization: Bearer ACCESS_TOKEN
    + Body

            {
                first_name: "Foo",
                last_name: "Baz",
                phone: "6177140001",
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
                first_name: "Foo",
                last_name: "Baz",
                phone: "6177140001",
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
                first_name: "Foo",
                last_name: "Bar",
                phone: "6177140000",
                success: true
            }

## Reset Password [/user/reset_password]
### Reset a User's Password [POST]
Reset password for a specific user. Takes the email address of a user, generates a new
temporary password for them, emails them the new password, and revokes all existing access
tokens.

+ Parameters
    + email (string, required)
        The email address of the user whose password should be reset. Must correspond
        to an existing user account.

+ Request
    + Body

            {
                email: "foo@bar.com"
            }

+ Response 201
    Errors
    + `email_required` (`400`) - no email address specified
    + `user_not_found` (`400`) - an existing user with that email address was not found

    + Body

            {
                email: "foo@bar.com",
                success: true
            }
