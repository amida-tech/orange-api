# Group Adherences
An adherence event is when the user takes their medication (either when they're
supposed to, _adhering_, or not, _nonadhering_).

## Adherence Events Collection [/user/adherences]
### Create an Adherence [POST]
Store details of a new adherence event (e.g., when a user signifies they've
taken their medication).

+ Parameters
    + medication_id (integer, required)

        unique ID of the medication for which the user has adhered
    + date (string, required, 2015-05-31T19:27:09+00:00)
        
        ISO 8601 combined date-time in UTC representing the date and time at which _the user took the medication_

    + notes (string, optional)

        free-text field for things such as observations and reactions recorded by the suer

+ Request
    + Headers

        Authorization: Bearer ACCESS_TOKEN

    + Body
    
        {
            medication_id: 1,
            date: "2015-05-31T19:27:09+00:00",
            notes: "Feeling sleepy now!"
        }

+ Response 200
    Errors
    + `access_token_required` (401) - no access token specified in
    `Authorization` header
    + `invalid_access_token` (401) - the access token specified is invalid
    + `invalid_date` (400) - the date field specified is not in valid ISO 8601 format
    + `invalid_medication_id` (400) - no medication with the specified ID can be found

    + Body

            {
                id: 1,
                medication_id: 1,
                date: "2015-05-31T19:27:09+00:00",
                notes: "Feeling sleepy now!",
                success: true
            }

### Retrieve all Adherence [GET]
Get a list of all adherence events for the user. Includes full information on each,
but `medication_id` is not expanded out into `medication`.

+ Parameters
    + limit (integer, optional)

        Maximum number of results to return. Defaults to 25.

     + offset (integer, optional)

         Number of initial results to ignore (used in combination with `limit`)
         for pagination. Defaults to 0.

    + sort_by (string, optional)
    
        Field to sort results by. Must by either `id` or `date`, and defaults
        to `id`.

    + sort_order (string, optional)
    
        The order to sort results by: either `asc` or `desc`. Defaults to
        `asc`.

    + start_date (string, optional)

        Restrict results to events that took place after this date. Must be
        a valid ISO 8601 datetime. Defaults to 0.

    + end_date (string, optional)

        Restrict results to events that took place before this date. Must be
        a valid ISO 8601 datetime. Defaults to infinity.

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
    + `invalid_start_date` (400) - the specified start date is an invalid ISO 8601 datetime
    + `invalid_end_date` (400) - the specified end date is an invalid ISO 8601 datetime

    + Body

            {
                adherences: [
                    {
                        id: 1,
                        medication_id: 1,
                        date: "2015-05-31T19:27:09+00:00",
                        notes: "Feeling sleepy now!"
                    },
                    ...
                ],
                count: 46,
                success: true
            }


## Adherence Event [/users/adherence/{id}]
### Retrieve One Adherence [GET]
View information on an individual adherence event.

+ Parameters
    + id (integer, required)

        unique ID of the adherence

+ Request
    + Headers

        Authorization: Bearer ACCESS_TOKEN

+ Response 200
    Errors
    + `access_token_required` (401) - no access token specified in
    `Authorization` header
    + `invalid_access_token` (401) - the access token specified is invalid
    + `invalid_adherence_id` (404) - an adherence with that ID was not found

    + Body

            {
                id: 1,
                medication_id: 1,
                date: "2015-05-31T19:27:09+00:00",
                notes: "Feeling sleepy now!",
                success: true
            }

### Change an Adherence [PUT]
Change information (medication, date and/or notes) of a single adherence event.

+ Parameters
    + id (integer, required)

        unique ID of the adherence (*url*)

    + medication_id (integer, optional)

        ID of a medication to change the adherence to. Must correspond to an existing
        medication.

    + date (string, optional) - new ISO 8601 datetime to change the date of the adherence to

    + notes (string, optional)

        String to change the notes field of the adherence to. If blank, will save the notes
        field blank correspondingly.

+ Request
    + Headers

        Authorization: Bearer ACCESS_TOKEN

    + Body

            {
                medication_id: 1,
                date: "2015-05-31T19:27:09+00:00",
                notes: "Not sleepy from this - forgot I took a melatonin pill earlier!"
            }

+ Response 200
    Errors
    + `access_token_required` (401) - no access token specified in
    `Authorization` header
    + `invalid_access_token` (401) - the access token specified is invalid
    + `invalid_adherence_id` (404) - an adherence with that ID was not found
    + `invalid_date` (400) - the date field specified is not in valid ISO 8601 format
    + `invalid_medication_id` (400) - no medication with the specified ID can be found
    
    + Body

            {
                id: 1,
                medication_id: 1,
                date: "2015-05-31T19:27:09+00:00",
                notes: "Not sleepy from this - forgot I took a melatonin pill earlier!",
                success: true
            }

### Delete an Adherence [DELETE]
Remove a single adherence event (this will update generated statistics correspondingly, so be careful!)

+ Parameters
    + id (integer, required)

        unique ID of the adherence (*url*)

+ Request
    + Headers

        Authorization: Bearer ACCESS_TOKEN

+ Response 200
    Errors
    + `access_token_required` (401) - no access token specified in
    `Authorization` header
    + `invalid_access_token` (401) - the access token specified is invalid
    + `invalid_adherence_id` (404) - an adherence event with that ID was not found

    + Body

            {
                id: 1,
                medication_id: 1,
                date: "2015-05-31T19:27:09+00:00",
                notes: "Feeling sleepy now!"
                success: true
            }


