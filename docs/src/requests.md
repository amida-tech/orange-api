# Group Requests
Each user can request access to another user's patients. This is done by making a `POST` request
to `/requested`, after which the request can be viewed at `GET /requested` and cancelled at
`DELETE /requested/:id` if needed.

The user to which the request was made can then view the request at `/requests` and close it
by making a `DELETE` request to `/requests/:id`. As discussed in greater detail below, this
`DELETE` request should contain a JSON body with either `status: accepted` or `status: rejected`
depending on the outcome. Note that `DELETE`ing the request does not actually share any patients:
that must be done seperately using the `POST /patients/:patientid/shares` endpoint. This way the
user can choose to selectively share just some of their patients.

Deleted requests are still shown, so the `status` field should be used to determine between
requests. Possible values are `pending`, `cancelled`, `accepted` and `rejected`.

Note that if user A requests access from user B, the request ID for user A (at `/requested`) is
not necessarily the same as the request ID for user B (at `/requests`).

## Requests From User [/requested]
### Create new Request [POST]
Request access to another user's patients from the current user.

+ Parameters
    + email (string, required) - email address of the user to request access from
    
+ Request
    + Headers

            Authorization: Bearer ACCESS_TOKEN

    + Body
    
            {
                email: "another@user.com"
            }

+ Response 201
    Errors
    + `access_token_required` (401) - no access token specified in
    `Authorization` header
    + `invalid_access_token` (401) - the access token specified is invalid
    + `email_required` (400) - an email address must be specified
    + `invalid_email` (400) - the email address specified does not correspond to an existing user
    + `already_requested` (400) - a request has already been made to that user from this user
    + `cant_request_yourself` (400) - a request can't be made to request sharing with yourself

    + Body

            {
                id: 1,
                email: "another@user.com",
                status: "pending",
                success: true
            }

### List Requests [GET]
View a list of all requests the current user has made.

+ Parameters
    + limit (integer, optional)

        Maximum number of results to return. Defaults to 25.

    + offset (integer, optional)

         Number of initial results to ignore (used in combination with `limit`)
         for pagination. Defaults to 0.

    + sort_by (string, optional)
    
        Field to sort results by. Must by either `id` or `email`
        and defaults to `id`.

    + sort_order (string, optional)
    
        The order to sort results by: either `asc` or `desc`. Defaults to
        `asc`.

    + email (string, optional)

        Filter results by email address of the user the request was made to. Matches any email
        addresses that contain the specified email as a substring.

    + status (string, optional)

        Filter results by request status (matches exactly).

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
    + `invalid_status` (400) - the specified status to filter by is not `pending`, `cancelled`, `accepted` or `rejected`

    + Body

            {
                requests: [
                    {
                        id: 1,
                        email: "another@user.com"
                        status: "pending",
                    },
                    ...
                ],
                count: 2,
                success: true
            }


## Request From User [/requested/{requestid}]
### Cancel Request [DELETE]
Cancel an existing request to access another user's patient data.

+ Parameters
    + requestid (integer, required)

        unique ID of the request (*url*)

+ Request
    + Headers

            Authorization: Bearer ACCESS_TOKEN

+ Response 200
    Errors
    + `access_token_required` (401) - no access token specified in
    `Authorization` header
    + `invalid_access_token` (401) - the access token specified is invalid
    + `invalid_request_id` (404)

        a request made with the specified ID by the current user was not found, or it was already cancelled or closed
    + Body

            {
                id: 1,
                email: "another@user.com",
                status: "cancelled",
                success: true
            }

## Requests to User [/requests]
### List Requests [GET]
View a list of all requests made to the current user by other users requesting the current user
to share their patient data.

+ Parameters
    + limit (integer, optional)

        Maximum number of results to return. Defaults to 25.

    + offset (integer, optional)

         Number of initial results to ignore (used in combination with `limit`)
         for pagination. Defaults to 0.

    + sort_by (string, optional)
    
        Field to sort results by. Must by either `id` or `email`
        and defaults to `id`.

    + sort_order (string, optional)
    
        The order to sort results by: either `asc` or `desc`. Defaults to
        `asc`.

    + email (string, optional)

        Filter results by email address of the user the request was made from. Matches any email
        addresses that contain the specified email as a substring.
    + status (string, optional)

        Filter results by request status (matches exactly).

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
    + `invalid_status` (400) - the specified status to filter by is not `pending`, `cancelled`, `accepted` or `rejected`

    + Body

            {
                requests: [
                    {
                        id: 1,
                        email: "original@user.com",
                        status: "pending"
                    },
                    ...
                ],
                count: 2,
                success: true
            }

## Request To User [/requests/{requestid}]
### Close Request [DELETE]
Close a request another user has made to access the current user's data. A `status`
key should be sent with this request with a value of either `accepted` or `rejected`
indicating the outcome of the request. Note that `status` is used purely to notify
the user, and `status=accepted` does not actually share any data with the requesting
user. Instead, that must be done by making requests to the `POST /patients/:patientid/shares`
endpoint. This way the user can selectively choose to share just some of thier patients.

+ Parameters
    + requestid (integer, required)

        unique ID of the request (*url*)

    + status (string, required)
    
        Outcome of the request. Must be either `accepted` or `rejected`.

+ Request
    + Headers

            Authorization: Bearer ACCESS_TOKEN

    + Body

            {
                status: "accepted"
            }

+ Response 200
    Errors
    + `access_token_required` (401) - no access token specified in
    `Authorization` header
    + `invalid_access_token` (401) - the access token specified is invalid
    + `invalid_request_id` (404)

        a request made with the specified ID by the current user was not found, or it was already cancelled or closed
    + `invalid_status` (400) - the `status` body key must be either `accepted` or `rejected`

    + Body

            {
                id: 1,
                email: "another@user.com",
                status: "accepted",
                success: true
            }

