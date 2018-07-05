# Group Users
## User [/user]
### Register a New User [POST]
Register a new user, and create a new patient for them as well.

+ Parameters
    + email (string, required)
        The email address of the new user. Validated to make sure it's a valid
        email address.

    + first_name (string, optional) - the first name of the new user
    + last_name (string, optional) - the last name of the new user
    + phone (string, optional) - the phone number of the new user
    + role (string, required) - the role of the new user "user" or "clinician"

+ Request
    + Body

            {
                email: "foo@bar.com",
                first_name: "Foo",
                last_name: "Bar",
                phone: "6177140000",
                role: "clinician"
            }

+ Response 201
    Errors
    + `email_required` (`400`) - no email address specified
    + `invalid_email` (`400`) - the email address specified is not a valid one
    + `invalid_role` (`400`) - the role specified is not a valid one
    + `user_already_exists` (`400`) - there is already a user with that email
    address

    + Body

            {
                email: "foo@bar.com",
                first_name: "Foo",
                last_name: "Bar",
                phone: "6177140000",
                role: "clinician",
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
                role: "clinician",
                npi: "1245319599",
                success: true
            }

### Change User Info [PUT]
Change basic metadata about the current user.

+ Parameters
    + first_name (string, optional) - new first name
    + last_name (string, optional) - new last name
    + phone (string, optional) - new phone number
    + npi (string, optional) - new npi (only will work if the user's role is "clinician")

+ Request
    + Headers

            Authorization: Bearer ACCESS_TOKEN
    + Body

            {
                first_name: "Foo",
                last_name: "Baz",
                phone: "6177140001",
                npi: "1245319599"
            }
+ Response 200
    Errors
    + `access_token_required` (401) - no access token specified in `Authorization`
    header
    + `invalid_access_token` (401) - the access token specified is invalid
    + `invalid_npi` (`400`) - the npi specified is not a valid one

    + Body

            {
                email: "foo@bar.com",
                first_name: "Foo",
                last_name: "Baz",
                phone: "6177140001",
                role: "clinician",
                npi: "1245319599",
                success: true
            }


### Delete User [DELETE]
Permanently remove the user, including all metadata stored on them.
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
                role: "clinician",
                npi: "1245319599",
                success: true
            }
