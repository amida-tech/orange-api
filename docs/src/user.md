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

+ Request
    + Body

            {
                email: "foo@bar.com",
                password: "foobar",
                first_name: "Foo",
                last_name: "Bar"
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
                success: true
            }

### Change User Info [PUT]
Change basic metadata about the current user, including their password.

+ Parameters
    + first_name (string, optional) - new first name
    + last_name (string, optional) - new last name
    + password (string, optional)

        New password. **Note that if the password is changed, all access tokens are revoked**.

+ Request
    + Headers

            Authorization: Bearer ACCESS_TOKEN
    + Body

            {
                first_name: "Foo",
                last_name: "Baz",
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
                success: true
            }

