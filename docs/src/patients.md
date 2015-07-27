# Group Patients
Remember, patients are the resources for which we actually store medication/etc
data, rather than users (and we have a many to many association between patients
and users).

When a user is created, a corresponding patient for them is also created. The user can then
optionally create more patients for e.g., children dependents.

Patients can then be shared with other users. There are three levels of sharing: *family prime*
(`prime`), *family* (`family`) and *anyone* (`anyone`). *Family prime* is intended to represent
family extremely close to the patient (e.g., parents) who should have access to almost everything,
*family* is intended for wider family of the patient, and *anyone* is intended for everyone else
(e.g., doctors).

At the patient level, a user's access to data is determined by which one of the above three groups
they're a member of. A patient can set global *read* (`read`) or *read-write* (`write`) permissions
for each of the three share categories, as well as an additional overriding *read*/*write* permission
for each user the patient is shared with (so each share has either `read`, `write` or `default`
permissions).

In a patient response object, `access_anyone`, `access_family` and `access_prime` represent the permissions
of the *anyone*/*family*/*family prime* share user groups respectively. The `access` field denotes
the current user's access to the patient, and will always be either `read` or `write` (if it is set
to `default`, it will be changed to the relevant value; this is **not** true of the
`/patients/:id/share/` endpoints).

These generic permissions control access to most of a patient's resources, but medications, journal
entries, doses and schedules are slightly more complicated. As described in the medications section, each
medication has its own additional set of access controls. For each of their medications, the patient
can explicitly set the access level of *family prime*, *family* and *anyone*. This then controls access
to that medication, any journal entries tagged with that medication, any schedule events for that
medication, and any dose events for that medication.

There are three access levels that can be set for each group on this per-medication basis: `read`,
`write` and `none`. `read` and `write` behave as they do in a patient-wide context, and `none` means
that that user group has no access at all to the medication or it's resources.

Each patient returned by the API has an `avatar` field containing the path of that patient's
avatar (image) endpoint. As documented below, `GET`ting this path returns the user's avatar
(initially a default image) and `POST`ing to this path with raw image data sets the avatar
to the POSTed data.

Each patient returned also has a `creator` field (which cannot be modified) containing the email address
of the user who created the patient, and a `me` boolean field representing whether the patient corresponds
to that user's "own log". `me` is `true` for the patient automatically created when a user registers,
and `false` otherwise.

## User's Patients [/patients]
### Create new Patient [POST]
Create a new patient, initially shared with the current user with write permissions,
and no-one else. For example, this should be called upon initial setup of the app to
create a patient for the end user, and can later be called to create a new patient representing
the child of the patient.

+ Parameters
    + first_name (string, required) - the first name of the patient
    + last_name (string, optional) - the last name of the patient
    + birthdate (string, optional)

        Optional date of birth of the patient, formatted as an ISO 8601 YYYY-MM-DD
    + sex (string, optional)

        String representing sex of the user. Must be "male", "female", "other" or "unspecified".
    + phone (string, optional)

        Optional phone number of the patient, formatted as a string
    + access_anyone (*string*)

        The default access permissions that users this patient is shared with under the `anyone`
        group should have. Must be either `read` or `write`.  Defaults to `read`.
    + access_family (*string*)

        The default access permissions that users this patient is shared with under the `family`
        group should have. Must be either `read` or `write`.  Defaults to `read`.
    + access_prime (*string*)

        The default access permissions that users this patient is shared with under the `prime` group
        should have. Must be either `read` or `write`.  Defaults to `write`.
    
+ Request
    + Headers

            Authorization: Bearer ACCESS_TOKEN

    + Body
    
            {
                first_name: "Dependent",
                last_name: "Patient",
                birthdate: "1990-01-01",
                sex: "male",
                phone: "6177140000",
                access_anyone: "read",
                access_family: "read",
                access_prime: "write"
            }

+ Response 201
    Errors
    + `access_token_required` (401) - no access token specified in
    `Authorization` header
    + `invalid_access_token` (401) - the access token specified is invalid
    + `first_name_required` (400) - no first name specified
    + `invalid_sex` (400)

        the sex field, if passed, must be either `male`, `female`, `other` or `unspecified`

    + `invalid_birthdate` (400) - the birthdate field, if passed, must be a valid `YYYY-MM-DD` date
    + `invalid_access_anyone` (400) - the `access_anyone` field, if passed, must be either `read` or `write`
    + `invalid_access_family` (400) - the `access_family` field, if passed, must be either `read` or `write`
    + `invalid_access_prime` (400) - the `access_prime` field, if passed, must be either `read` or `write`

    + Body

            {
                id: 1,
                first_name: "Dependent",
                last_name: "Patient",
                birthdate: "1990-01-01",
                sex: "male",
                phone: "6177140000",
                avatar: "/v1/patients/1/avatar.jpg",
                creator: "foo@bar.com",
                me: true,
                access_anyone: "read",
                access_family: "read",
                access_prime: "write",
                access: "write",
                group: "owner",
                success: true
            }

### List Patients [GET]
View a list of all patients the current user has access to (either read or write).

+ Parameters
    + limit (integer, optional)

        Maximum number of results to return. Defaults to 25.

    + offset (integer, optional)

         Number of initial results to ignore (used in combination with `limit`)
         for pagination. Defaults to 0.

    + sort_by (string, optional)
    
        Field to sort results by. Must by either `id`, `first_name` or `last_name`,
        and defaults to `id`.

    + sort_order (string, optional)
    
        The order to sort results by: either `asc` or `desc`. Defaults to
        `asc`.

    + first_name (string, optional)

        Filter results by first name of patient. Performs fuzzy matching.

    + last_name (string, optional)

        Filter results by last name of patient. Performs fuzzy matching.
    + last_name (string, optional)

        Filter results by group of patient. Matches exactly.
    + creator (string, optional)

        Filter results by email address of creator. Matches any email addresses that
        contain the specified email as a substring.

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
    + `invalid_group` (400)

        the specified group to filter by is invalid (must be `owner`, `anyone`,
        `family` or `prime`)

    + Body

            {
                patients: [
                    {
                        id: 1,
                        first_name: "Dependent",
                        last_name: "Patient",
                        birthdate: "1990-01-01",
                        sex: "male",
                        phone: "6177140000",
                        avatar: "/v1/patients/1/avatar.jpg",
                        creator: "foo@bar.com",
                        me: true,
                        access_anyone: "read",
                        access_family: "read",
                        access_prime: "write",
                        access: "write",
                        group: "owner"
                    },
                    ...
                ],
                count: 2,
                success: true
            }


## Patient [/patients/{patientid}]
### View Patient Info [GET]
View the name of a specific patient as well as the current user's access (`read` or
`write`) to them, and the group the patient is shared with them through (either `owner`,
`prime`, `family` or `anyone`). To view and modify other user's access to this patient, see the
`/patients/{id}/shares` endpoint.

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
                first_name: "Dependent",
                last_name: "Patient",
                birthdate: "1990-01-01",
                sex: "male",
                phone: "6177140000",
                avatar: "/v1/patients/1/avatar.jpg",
                creator: "foo@bar.com",
                me: true,
                access_anyone: "read",
                access_family: "read",
                access_prime: "write",
                access: "write",
                group: "prime",
                success: true
            }

### Update Patient Info [PUT]
Update a patients' details. This requires the user to have `write` access to the patient.
Name, group and access level can be modified here. The access level can be modified in
two ways: setting `access` (to `read`, `write`, `none` or `default`) will set the access level the
current user has to the patient, and setting `access_prime`, `access_family` or `access_anyone`
(to `read` or `write`) will set the group-wide access levels for the patient.

The owner of a patient cannot change their access level from `write` or their group from `owner`.

Setting `access` to `none` will stop sharing the patient with the current user.

+ Parameters
    + patientid (integer, required)

        unique ID of the patient (**not** user-specific) (*url*)

    + first_name (string, optional) - new first name of the patient
    + last_name (string, optional) - new last name of the patient
    + birthdate (string, optional)

        Optional date of birth of the patient, formatted as an ISO 8601 YYYY-MM-DD
    + sex (string, optional)

        String representing sex of the patient. Must be "male", "female", "other" or "unspecified".
    + phone (string, optional)

        New phone number of the patient
    + access (string, optional)

        Explicitly set the patient's access level to `read`, `write`, `default` or `none`.
        `none` stops sharing the patient with the user. **This is permanent and potentially
        irreversible, and hence should be used with caution**.
    + group (string, optional)

        Change the group of the current user. If the user is the `owner`, their group cannot be changed.
        Otherwise, the group can be changed between `prime`, `family` and `anyone`.
    + access_anyone (string, optional)

        Change the access level of the `anyone` user share group. Must be either `read` or `write.
    + access_family (string, optional)

        Change the access level of the `family` user share group. Must be either `read` or `write.
    + access_prime (string, optional)

        Change the access level of the `prime` user share group. Must be either `read` or `write.

+ Request
    + Headers

            Authorization: Bearer ACCESS_TOKEN

    + Body
    
            {
                first_name: "Gin",
                last_name: "Smith",
                birthdate: "1991-01-01",
                sex: "female",
                phone: "6177140001",
                access: "write",
                group: "family",
                access_anyone: "read",
                access_family: "read",
                access_prime: "read"
            }


+ Response 200
    Errors
    + `access_token_required` (401) - no access token specified in
    `Authorization` header
    + `invalid_access_token` (401) - the access token specified is invalid
    + `invalid_patient_id` (404) - a patient with the specified ID was not found
    + `unauthorized` (403) - the current user does not have write access to this patient
    + `invalid_sex` (400)

        the sex field, if passed, must be either `male`, `female`, `other` or `unspecified`
    + `invalid_birthdate` (400) - the birthdate field, if passed, must be a valid `YYYY-MM-DD` date
    + `invalid_access` (400) - the access field, if passed, must be either `read`, `write`, `default` or `none`
    + `invalid_group` (400) - the group field, if passed, must be either `prime`, `family` or `anyone`
    + `is_owner` (400) - the share belongs to the user owning the patient so cannot be changed
    + `invalid_access_anyone` (400) - the `access_anyone` field, if passed, must be either `read` or `write`
    + `invalid_access_family` (400) - the `access_family` field, if passed, must be either `read` or `write`
    + `invalid_access_prime` (400) - the `access_prime` field, if passed, must be either `read` or `write`

    + Body

            {
                id: 1,
                first_name: "Gin",
                last_name: "Smith",
                birthdate: "1991-01-01",
                sex: "female",
                phone: "6177140001",
                avatar: "/v1/patients/1/avatar.jpg",
                creator: "foo@bar.com",
                me: true,
                access_anyone: "read",
                access_family: "read",
                access_prime: "read",
                access: "write",
                group: "family",
                success: true
            }

### Delete Patient [DELETE]
Remove a patient for whom the user is the owner. **This permanently removes the patient, all
of their associated habits, doctors, pharmacies, medications and dose events _for all
users the patient is shared with_** and as such should be used with extreme caution.

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
                first_name: "Gin",
                last_name: "Smith",
                birthdate: "1991-01-01",
                sex: "female",
                phone: "6177140001",
                avatar: "/v1/patients/1/avatar.jpg",
                creator: "foo@bar.com",
                me: true,
                access_anyone: "read",
                access_family: "read",
                access_prime: "write",
                access: "write",
                group: "owner",
                success: true
            }

## Patient Data Dump [/patients/{patientid}.json]
### View JSON Data Dump [GET]
View a data dump of all data associated with a patient (specifically the patient metadata,
habits, journal entries, doctors, pharmacies, medications and dose events). Only those journal
entries, medications and dose events that the user has read access to (remember medications can
override patient-wide access permissions) are shown.

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
                id: 34,
                first_name: "Patient 11",
                last_name: "number 11",
                birthdate: "1990-01-01",
                sex: "male",
                phone: "6177140000",
                avatar: "/v1/patients/34/avatar.png",
                creator: "foo@bar.com",
                me: true,
                access_anyone: "read",
                access_family: "read",
                access_prime: "write",
                group: "anyone",
                access: "read",
                habits: {
                    wake: null,
                    sleep: null,
                    breakfast: null,
                    lunch: null,
                    dinner: null,
                    tz: "Etc/UTC"
                },
                entries: [
                    {
                        date: "2015-07-15T13:18:21.000-04:00",
                        text: "example journal entry",
                        medication_ids: [
                            1
                        ],
                        mood: "",
                        id: 1
                    }
                ],
                doctors: [
                    {
                        name: "test doctor",
                        phone: "",
                        address: "",
                        notes: "",
                        id: 1
                    }
                ],
                pharmacies: [
                    {
                        name: "test pharmacy",
                        phone: "",
                        address: "",
                        hours: {
                            monday: {},
                            tuesday: {},
                            wednesday: {},
                            thursday: {},
                            friday: {},
                            saturday: {},
                            sunday: {}
                        },
                        notes: "",
                        id: 1
                    }
                ],
                medications: [
                    {
                        name: "test medication",
                        rx_norm: "",
                        rx_number: "",
                        ndc: "",
                        dose: {
                            quantity: 1,
                            unit: "dose"
                        },
                        route: "",
                        form: "",
                        quantity: 1,
                        type: "",
                        fill_date: null,
                        doctor_id: null,
                        pharmacy_id: null,
                        access_anyone: "default",
                        access_family: "default",
                        access_prime: "default",
                        number_left: null,
                        schedule: {
                            as_needed: true,
                            regularly: false
                        },
                        id: 1
                    }
                ],
                doses: [
                    {
                        medication_id: 1,
                        date: "2015-07-15T13:18:21.000-04:00",
                        notes: "",
                        id: 1
                    }
                ],
                shares: [
                    {
                        is_user: true,
                        access: "write",
                        group: "owner",
                        email: "foo26@bar.com",
                        id: 42
                    },
                    {
                        is_user: true,
                        access: "default",
                        group: "anyone",
                        email: "foo25@bar.com",
                        id: 43
                    }
                ],
                success: true
            }


## Patient's Avatar [/patients/{patientid}/avatar(.ext)]
### View Patient Avatar [GET]
View the image avatar of a specific patient. File extensions can be added to the URL
(for example, `/patients/1/avatar.jpg`, `/patients/1/avatar.gif`) but the image 
**will not** be converted to the format associated with the extension, but instead
just returned in whatever format it was stored in. The URL in the avatar field in
a patient's details will **automatically include the correct extension** for the image.

The user needs read access to the patient.

The `Content-Type` header will be populated with the correct MIME type.

+ Parameters
    + patientid (integer, required)

        unique ID of the patient (**not** user-specific)

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

            raw image data

### Upload Patient Avatar [POST]
Upload the image avatar of a specific patient. Again, file extensions can be added to
the URL but are ignored and will not be used to convert the image format. Note that for this
endpoint, raw binary data should be `POST`ed rather than `application/json`-encoded data.

The user needs write access to the patient.

Also note that this endpoint uses `POST` not `PUT` contrary to REST resource routing
conventions.

+ Parameters
    + patientid (integer, required)

        unique ID of the patient (**not** user-specific) (*url*)

+ Request
    + Headers

            Authorization: Bearer ACCESS_TOKEN

    + Body

            raw image data

+ Response 201
    Errors
    + `access_token_required` (401) - no access token specified in
    `Authorization` header
    + `invalid_access_token` (401) - the access token specified is invalid
    + `invalid_patient_id` (404) - a patient with the specified ID was not found
    + `unauthorized` (403) - the current user does not have write access to this patient
    + `invalid_image` (400) - the POSTed data is an invalid image

    + Body

            {
                success: true,
                avatar: "/v1/patients/1/avatar.gif"
            }

## Patient's Shared Users [/patients/{patientid}/shares]
This endpoint represents all of the users a specific patient is shared with: including
both `read` and `write` access. The IDs in this section represent patient-user relationships,
not users themselves, so if patient `1` is shared with user `7` then the shared ID may be `16`,
rather than `7`.

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
    + access (string, required)
    
        `read`, `write` or `default` to signify the level of access the user should have to the patient
        (`default` means the user has whatever access to the patient the patient-wide permissions
        give them, whereas `read` and `write` explicitly override those patient-wide permissions)
    + group (string, required)

        The share group to add the user to. Must be either `prime`, `family` or `anyone`.
    
+ Request
    + Headers

            Authorization: Bearer ACCESS_TOKEN

    + Body
    
            {
                email: "care@giver.com",
                access: "read",
                group: "family"
            }

+ Response 201
    Errors
    + `access_token_required` (401) - no access token specified in
    `Authorization` header
    + `invalid_access_token` (401) - the access token specified is invalid
    + `invalid_patient_id` (404) - a patient with the specified ID was not found
    + `unauthorized` (403) - the current user does not have write access to this patient
    + `email_required` (400) - an email address to share with must be specified
    + `invalid_email` (400) - the email address specified is not a valid one
    + `access_required` (400) - the desired access level must be specified
    + `invalid_access` (400) - the access string specified is not a valid one (must be either `read`, `write` or `default`)
    + `group_required` (400) - the share group the user should be added to must be specified
    + `invalid_group` (400) - the share group the user is not a valid one (must be either `prime`, `family` or `anyone`)

    Note that this `id` is for the user-patient association, *not* the user ID.

    `is_user` (`boolean`) signifies whether the user is already an existing
    user of the app, or whether they've been sent an email inviting them to sign up.

    + Body

            {
                id: 1,
                email: "care@giver.com",
                access: "read",
                group: "family",
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

        Filter results by email address of user. Matches any email addresses that
        contain the specified email as a substring.

    + is_user (boolean, optional)

        filter results by selecting only user that are existing users (as opposed to those
        who've been invited but still haven't signed up)

    + access (string, optional)

        filter results by selecting only users with the specified level of access (either
        `read` or `write`)

    + group (string, optional)

        filter results by selecting only users who are part of the specified share group (either
        `owner`, `prime`, `family` or `anyone`)

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
    + `invalid_group` (400) - the specified group value to filter by is invalid

    + Body

            {
                shares: [
                    {
                        id: 1,
                        email: "care@giver.com",
                        access: "write",
                        group: "family",
                        is_user: true
                    },
                    ...
                ],
                count: 2,
                success: true
            }

## Shared User [/patients/{patientid}/shares/{shareid}]
### Update Access Level [PUT]
Update the access another user has to a patient (the current user of course is required
to have `write` access to this patient). To modify the current user's access, see the
convenience method `PUT /patients/:patientid`.

Neither access nor group can be modified for the share for a user who owns a patient.

+ Parameters
    + patientid (integer, required)

        unique ID of the patient (**not** user-specific) (*url*)
    + shareid (integer, required)

        unique ID of the patient-user association (**not** the user ID) (*url*)

    + access (string, required)

        `read`, `write` or `default` to signify the new level of access the specified user should have to the patient
    + group (string, required)

        `anyone`, `family` or `prime to signify the new sharing group the specified user should be a member of
    
+ Request
    + Headers

            Authorization: Bearer ACCESS_TOKEN

    + Body
    
            {
                access: "write",
                group: "family"
            }

+ Response 200
    Errors
    + `access_token_required` (401) - no access token specified in
    `Authorization` header
    + `invalid_access_token` (401) - the access token specified is invalid
    + `unauthorized` (403) - the current user does not have write access to this patient
    + `invalid_patient_id` (404) - a patient with the specified ID was not found
    + `invalid_share_id` (404)

        A patient-user sharing relationship with the specified ID was not found (remember, this is _not_
        the same as the user ID)

    + `invalid_access` (400) - the specified access value to change to is invalid
    + `invalid_group` (400) - the specified group value to change to is invalid
    + `is_owner` (400) - the share belongs to the user owning the patient so cannot be modified

    + Body

            {
                id: 1,
                email: "care@giver.com",
                access: "write",
                group: "family",
                is_user: true,
                success: true
            }

# Stop Sharing with User [DELETE]
Stop sharing the specified patient's data with a specified user. The current user will
of course need write access to the patient. To stop sharing a patient with the _current_
user, see the convenience method `PUT /patients/:patientid`.

The owner's share cannot be deleted.

+ Parameters
    + patientid (integer, required)

        unique ID of the patient (**not** user-specific) (*url*)
    + shareid (integer, required)

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
    + `invalid_share_id` (404)

        A patient-user sharing relationship with the specified ID was not found (remember, this is _not_
        the same as the user ID)
    + `is_owner` (400) - the share belongs to the user owning the patient so cannot be removed

    + Body

            {
                id: 1,
                email: "care@giver.com",
                access: "write",
                group: "family",
                is_user: true,
                success: true
            }

