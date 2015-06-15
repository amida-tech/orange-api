# Group Patients
Remember, patients are the resources for which we actually store medication/etc
data, rather than users (and we have a many to many association between patients
and users).

There are two types of access a user can have to a patient: read-write (write) and read-only.
Read-write gives a user full access to everything, even allowing them to delete the
patient and change who the patient is shared with.

## User's Patients [/patients]
### Create new Patient [POST]
Create a new patient, initially shared with the current user with write permissions,
and no-one else. For example, this should be called upon initial setup of the app to
create a patient for the end user, and can later be called to create a new patient representing
the child of the patient.

+ Parameters
    + name (string, required) - the full human name of the patient
    
+ Request
    + Headers

            Authorization: Bearer ACCESS_TOKEN

    + Body
    
            {
                name: "Dependent Patient"
            }

+ Response 201
    Errors
    + `access_token_required` (401) - no access token specified in
    `Authorization` header
    + `invalid_access_token` (401) - the access token specified is invalid
    + `name_required` (400) - no name specified

    + Body

            {
                id: 1,
                name: "Dependent Patient",
                access: "write",
                success: true
            }

### List Patients [GET]
View a list of all patients the current user has access to: both read
(`access="read"`) and write (`access="write"`).

+ Parameters
    + limit (integer, optional)

        Maximum number of results to return. Defaults to 25.

    + offset (integer, optional)

         Number of initial results to ignore (used in combination with `limit`)
         for pagination. Defaults to 0.

    + sort_by (string, optional)
    
        Field to sort results by. Must by either `id` or `name`, and defaults
        to `id`.

    + sort_order (string, optional)
    
        The order to sort results by: either `asc` or `desc`. Defaults to
        `asc`.

    + name (string, optional)

        Filter results by name of patient. Performs fuzzy matching.

+ Request
    + Headers

            Authorization: Bearer ACCESS_TOKEN

+ Response 200
    Errors
    + `access_token_required` (401) - no access token specified in
    `Authorization` header
    + `invalid_access_token` (401) - the access token specified is invalid
    + `invalid_limit` (400) - the specified result limit is invalid
    + `invalid_offset` (400) - the specified result offset is invalid
    + `invalid_sort_by` (400) - the specified sort field is invalid
    + `invalid_sort_order` (400) - the specified sort order is invalid

    + Body

            {
                patients: [
                    {
                        id: 1,
                        name: "Dependent Patient",
                        access: "write"
                    },
                    ...
                ],
                count: 2,
                success: true
            }


## Patient [/patients/{patientid}]
### View Patient Info [GET]
View the name of a specific patient as well as the current user's access (`read` or
`write`) to them. To view and modify other user's access to this patient, see the
`/patients/{id}/shared` endpoint.

+ Parameters
    + patientid (integer, required)

        unique ID of the patient (**not** user-specific) (*url*)

+ Request
    + Headers

            Authorization: Bearer ACCESS_TOKEN

+ Response 200
    Errors
    + `access_token_required` (401) - no access token specified in
    `Authorization` header
    + `invalid_access_token` (401) - the access token specified is invalid
    + `invalid_patient_id` (404) - a patient with the specified ID was not found
    + `unauthorized` (403) - the current user does not have write access to this patient

    + Body

            {
                id: 1,
                name: "Dependent Patient",
                access: "write",
                success: true
            }

### Update Patient Info [PUT]
Update the name of a specific patient whom the user has `write` access to, as well
as toggle the current user's access from `write` to `read` or `none`. **This switch is
permanent** so should not be undertaken lightly: it means the user will never be able to
modify (for `read`) or even read (for `none`) any details (or medications or etc) of this
patient again, unless another user with `write` access reshares the patient with them.

If the user's access is changed to `none` and the patient is not shared with any other
users, then the patient and all its data _will be deleted_.

+ Parameters
    + patientid (integer, required)

        unique ID of the patient (**not** user-specific) (*url*)

    + name (string, optional) - new full human name of the patient

    + access (string, optional)
    
        If and only if the user's current access to the patient is `write` (which
        is needed to get something other than a 403 `unauthorized` response from this
        endpoint anyway), then `read` can be passed here to lower their access down to
        read only, or `none` to remove their access to the patient's data at all.
        **This is permanent, and should be used with extreme caution**.

+ Request
    + Headers

            Authorization: Bearer ACCESS_TOKEN

    + Body
    
            {
                name: "John Smith"
            }


+ Response 200
    Errors
    + `access_token_required` (401) - no access token specified in
    `Authorization` header
    + `invalid_access_token` (401) - the access token specified is invalid
    + `invalid_patient_id` (404) - a patient with the specified ID was not found
    + `unauthorized` (403) - the current user does not have write access to this patient
    + `invalid_access` (400) - the access string is not `none` or `read`

    + Body

            {
                id: 1,
                name: "John Smith",
                access: "write",
                success: true
            }

### Delete Patient [DELETE]
Remove a patient for whom the user has write access to. **This permanently removes
the patient, all of their associated habits, doctors, pharmacies, medications and adherences
_for all users the patient is shared with_** and as such should be used with extreme caution.

To completely remove a patient from the user's sphere of influence, note that `PUT` should be
called with `access="none"` rather than this method.

+ Parameters
    + patientid (integer, required)

        unique ID of the patient (**not** user-specific) (*url*)

+ Request
    + Headers

            Authorization: Bearer ACCESS_TOKEN

+ Response 200
    Errors
    + `access_token_required` (401) - no access token specified in
    `Authorization` header
    + `invalid_access_token` (401) - the access token specified is invalid
    + `invalid_patient_id` (404) - a patient with the specified ID was not found
    + `unauthorized` (403) - the current user does not have write access to this patient

    + Body

            {
                id: 1,
                name: "John Smith",
                access: "write",
                success: true
            }

## Patient's Shared Users [/patients/{patientid}/shared]
This endpoint represents all of the users a specific patient is shared with: including
both `read` and `write` access. The IDs in this section represent patient-user relationships,
not users themselves, so if patient `1` is shared with user `7` then the shared ID may be `16`,
rather than 7.

### Share with a User [POST]
Share a patient's data (a patient for whom the user has write access) with a new user specified by
email address. This user _can_ be an existing app user, but is not required to be: if they are then
they're automatically granted access to the patient's data, and if they're not they're sent an email
invitation to install the app, and once they do they'll receive automatic access to the patient's data.
The `is_user` field in the response distinguishes between the two cases: it's true in the case
of an existing user, and false in the case of a new user who's been invited.

An example use case here would be a mother (the user) wanting to share her child's (the
patient's) data with the father (another user).

+ Parameters
    + patientid (integer, required)

        unique ID of the patient (**not** user-specific) (*url*)
    + email (string, required) - the email address of the user to share data with
    + access (string, required) - `read` or `write` to signify the level of access the user should have to the patient
    
+ Request
    + Headers

            Authorization: Bearer ACCESS_TOKEN

    + Body
    
            {
                email: "care@giver.com",
                access: "read"
            }

+ Response 201
    Errors
    + `access_token_required` (401) - no access token specified in
    `Authorization` header
    + `invalid_access_token` (401) - the access token specified is invalid
    + `invalid_patient_id` (404) - a patient with the specified ID was not found
    + `unauthorized` (403) - the current user does not have write access to this patient
    + `invalid_email` (400) - the email address specified is not a valid one
    + `invalid_access` (400) - the access string specified is not a valid one (must be either `read` or `write`)

    Note that this `id` is for the user-patient association, *not* the user ID.

    `is_user` (`boolean`) signifies whether the user is already an existing
    user of the app, or whether they've been sent an email inviting them to sign up.

    + Body

            {
                id: 1,
                email: "care@giver.com",
                access: "read",
                is_user: true,
                success: true
            }

### List all Shared Users [GET]
For a patient whom the user has `read` access, get a list of all users (including the current one)
who have (either `read` or `write`) access to the patient.

+ Parameters
    + patientid (integer, required)

        unique ID of the patient (**not** user-specific) (*url*)
    + limit (integer, optional)

        Maximum number of results to return. Defaults to 25.

    + offset (integer, optional)

         Number of initial results to ignore (used in combination with `limit`)
         for pagination. Defaults to 0.

    + sort_by (string, optional)
    
        Field to sort results by. Must by either `id` or `email`, and defaults
        to `id`.

    + sort_order (string, optional)
    
        The order to sort results by: either `asc` or `desc`. Defaults to
        `asc`.

    + email (string, optional)

        Filter results by email address of user. Performs fuzzy matching.

    + is_user (boolean, optional)

        filter results by selecting only user that are existing users (as opposed to those
        who've been invited but still haven't signed up)

    + access (string, optional)

        filter results by selecting only users with the specified level of access (either
        `read` or `write`)

+ Request
    + Headers

            Authorization: Bearer ACCESS_TOKEN

+ Response 200
    Errors
    + `access_token_required` (401) - no access token specified in
    `Authorization` header
    + `invalid_access_token` (401) - the access token specified is invalid
    + `unauthorized` (403) - the current user does not have read access to this patient
    + `invalid_limit` (400) - the specified result limit is invalid
    + `invalid_offset` (400) - the specified result offset is invalid
    + `invalid_sort_by` (400) - the specified sort field is invalid
    + `invalid_sort_order` (400) - the specified sort order is invalid
    + `invalid_is_user` (400) - the specified is_user value to filter by is invalid
    + `invalid_access` (400) - the specified access value to filter by is invalid

    + Body

            {
                shared: [
                    {
                        id: 1,
                        email: "care@giver.com",
                        access: "write",
                        is_user: true
                    },
                    ...
                ],
                count: 2,
                success: true
            }

## Shared User [/patients/{patientid}/shared/{sharedid}]
### Update Access Level [PUT]
Update the access another user has to a patient (the current user of course is required
to have `write` access to this patient). To modify the current user's access, see the
convenience method `PUT /patients/:patientid`.

If the user's access is changed to `none` and the patient is not shared with any other
users, then the patient and all its data _will be deleted_ (this can of course only happen
with this endpoint if the user who's share is being modified is the current user).

+ Parameters
    + patientid (integer, required)

        unique ID of the patient (**not** user-specific) (*url*)
    + sharedid (integer, required)

        unique ID of the patient-user association (**not** the user ID) (*url*)

    + access (string, required)

        `read` or `write` to signify the new level of access the specified user should have to the patient
    
+ Request
    + Headers

            Authorization: Bearer ACCESS_TOKEN

    + Body
    
            {
                access: "write"
            }

+ Response 200
    Errors
    + `access_token_required` (401) - no access token specified in
    `Authorization` header
    + `invalid_access_token` (401) - the access token specified is invalid
    + `unauthorized` (403) - the current user does not have write access to this patient
    + `invalid_patient_id` (404) - a patient with the specified ID was not found
    + `invalid_shared_id` (404)

        A patient-user sharing relationship with the specified ID was not found (remember, this is _not_
        the same as the user ID)

    + `invalid_access` (400) - the specified access value to change to is invalid

    + Body

            {
                id: 1,
                email: "care@giver.com",
                access: "write",
                is_user: true,
                success: true
            }

# Stop Sharing with User [DELETE]
Stop sharing the specified patient's data with a specified user. The current user will
of course need write access to the patient. To stop sharing a patient with the _current_
user, see the convenience method `PUT /patients/:patientid`.

If this is the last user whom the patient is shared with, then the patient and _all their data_
will be deleted, so take care.

+ Parameters
    + patientid (integer, required)

        unique ID of the patient (**not** user-specific) (*url*)
    + sharedid (integer, required)

        unique ID of the patient-user association (**not** the user ID) (*url*)
    
+ Request
    + Headers

            Authorization: Bearer ACCESS_TOKEN

+ Response 200
    Errors
    + `access_token_required` (401) - no access token specified in
    `Authorization` header
    + `invalid_access_token` (401) - the access token specified is invalid
    + `unauthorized` (403) - the current user does not have write access to this patient
    + `invalid_patient_id` (404) - a patient with the specified ID was not found
    + `invalid_shared_id` (404)

        A patient-user sharing relationship with the specified ID was not found (remember, this is _not_
        the same as the user ID)

    + Body

            {
                id: 1,
                email: "care@giver.com",
                access: "write",
                is_user: true,
                success: true
            }

