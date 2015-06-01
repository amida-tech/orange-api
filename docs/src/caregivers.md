# Group Caregivers
Allows users to **share** their information with caregivers: in this
context, just other users of the app whom the user has chosen to share
information with.

The process is simple: the user can choose to share their data with a 
certain email address. If that email address corresponds to an existing user
of the app, then their data is shared with that user. Otherwise an email is
sent out inviting the new user to the app, and as soon as they sign up
they'll be able to see the shared data.

## Caregivers Collection [/users/caregivers]
### Share with a Caregiver [POST]
Share the user's data with a new caregiver specified by email address.
As detailed above, that email address can be an existing app user, but is not
required to be.

+ Parameters
    + email (string, required) - the email address of the user to share data with
    
+ Request
    + Headers

        Authorization: Bearer ACCESS_TOKEN

    + Body
    
        {
            email: "care@giver.com"
        }

+ Response 200
    Errors
    + `access_token_required` (401) - no access token specified in
    `Authorization` header
    + `invalid_access_token` (401) - the access token specified is invalid
    + `invalid_email` (`400`) - the email address specified is not a valid one

    Note that this `id` is for the user-caregiver association, *not* the user ID
    of the caregiver.

    `is_user` (`boolean`) signifies whether the caregiver is already an existing
    user of the app, or whether they've been sent an email inviting them to sign up.

    + Body

        {
            id: 1,
            email: "care@giver.com",
            is_user: true,
            success: true
        }

### List all Caregivers [GET]
Get a list of all the caregivers the user has shared data with. Includes full information on each.

+ Parameters
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

        Filter results by email address of caregiver. Performs fuzzy matching.

    + is_user (boolean, optional)  - filter results by selecting only caregivers that are existing users

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
    + `invalid_is_user` (400) - the specified is_user value to filter by is invalid

    + Body

        {
            caregivers: {
                id: 1,
                email: "care@giver.com",
                is_user: true
            },
            count: 2,
            success: true
        }

## Caregiver [/users/caregivers/{id}]
### Stop Sharing [DELETE]
Stop sharing the current user's data with this caregiver. Note that the caregiver
ID has to be sent, rather than the email address, but the caregiver ID can be
easily found from the email address using `GET /user/caregivers` as detailed
above.

+ Parameters
    + id (integer, required)

        unique caregiver ID of the caregiver (again, **not** the user ID of the caregiver) (*url*)

+ Request
    + Headers

        Authorization: Bearer ACCESS_TOKEN

+ Response 200
    Errors
    + `access_token_required` (401) - no access token specified in
    `Authorization` header
    + `invalid_access_token` (401) - the access token specified is invalid
    + `invalid_caregiver_id` (404) - a medication with that ID was not found

    + Body

            {
                id: 1,
                email: "care@giver.com",
                is_user: true,
                success: true
            }
