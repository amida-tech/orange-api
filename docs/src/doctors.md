# Group Doctors
Basic contact details for all of the doctors who've prescribed medication to
the current user.

## Doctors Collection [/user/doctors]
### Create a Doctor [POST]
Store details of a new doctor.

+ Parameters
    + name (string, required) - full name of the doctor
    + phone (string, optional) - contact phone number for the doctor
    + address (string, optional)

        Postal address of the doctor. Newlines can optionally be used to split
        lines.

+ Request
    + Headers

        Authorization: Bearer ACCESS_TOKEN

    + Body
    
        {
            name: "Dr. X",
            phone: "(617) 617-6177",
            address: "Doctor Street, DC, 2052"
        }

+ Response 200
    Errors
    + `access_token_required` (401) - no access token specified in
    `Authorization` header
    + `invalid_access_token` (401) - the access token specified is invalid
    + `invalid_phone` (400) - the phone number passed is not valid (it must
    only contain numbers, hyphens, spaces, parantheses and pluses)

    + Body

            {
                id: 1,
                name: "Dr. X",
                phone: "(617) 617-6177",
                address: "Doctor Street, DC, 2052"
                success: true
            }

### Retrieve all Doctors [GET]
Get a list of all the user's doctors. Includes full information on each.

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

        Filter results by name of doctor. Performs fuzzy matching.

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
                doctors: [
                    {
                        id: 1,
                        name: "Dr. X",
                        phone: "(617) 617-6177",
                        address: "Doctor Street, DC, 2052"
                    },
                    ...
                ],
                count: 3,
                success: true
            }


## Doctor [/users/doctor/{id}]
### Retrieve a Doctor [GET]
View information on an individual doctor. test

+ Parameters
    + id (integer, required)

        unique ID of the doctor (*url*)

+ Request
    + Headers

        Authorization: Bearer ACCESS_TOKEN

+ Response 200
    Errors
    + `access_token_required` (401) - no access token specified in
    `Authorization` header
    + `invalid_access_token` (401) - the access token specified is invalid

    + Body

            {
                id: 1,
                name: "Dr. X",
                phone: "(617) 617-6177",
                address: "Doctor Street, DC, 2052",
                success: true
            }

### Change a Doctor's Info [PUT]
Change information (name, phone and/or address) of an individual doctor.

+ Parameters
    + id (integer, required)

        unique ID of the doctor (*url*)
    + name (string, optional) 

        Full name of the doctor. Must not be blank.

    + phone (string, optional) - contact phone number for the doctor
    + address (string, optional)

+ Request
    + Headers

        Authorization: Bearer ACCESS_TOKEN

    + Body

            {
                name: "Dr. Y",
                phone: "(716) 716-7166",
                address: "Doctor Street, DC, 2052"
            }

+ Response 200
    Errors
    + `access_token_required` (401) - no access token specified in
    `Authorization` header
    + `invalid_access_token` (401) - the access token specified is invalid
    + `invalid_phone` (400) - the phone number passed is not valid (it must
    only contain numbers, hyphens, spaces, parantheses and pluses)
    
    + Body

            {
                id: 1,
                name: "Dr. Y",
                phone: "(716) 716-7166",
                address: "Doctor Street, DC, 2052",
                success: true
            }

### Delete a Doctor [DELETE]
Remove information on a single doctor.

+ Parameters
    + id (integer, required)

        unique ID of the doctor (*url*)

+ Request
    + Headers

        Authorization: Bearer ACCESS_TOKEN

+ Response 200
    Errors
    + `access_token_required` (401) - no access token specified in
    `Authorization` header
    + `invalid_access_token` (401) - the access token specified is invalid

    + Body

            {
                id: 1,
                name: "Dr. X",
                phone: "(617) 617-6177",
                address: "Doctor Street, DC, 2052",
                success: true
            }
