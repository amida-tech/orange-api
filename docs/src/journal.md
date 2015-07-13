# Group Journal Entries
Basic free-text journal for the patient to enter notes about their day and such in.
While medications can be tagged in journal entries, entries that correspond
exactly to dose events should probably just be stored in the `notes` field of a
dose event.

*Hashtags* are parsed from each journal entry and returned in a `hashtags` array of
`string`s.

## Journal Entries [/patients/{patientid}/journal]
### Create an Entry [POST]
Store details of a new journal entry (the current user will need write access to **both**
the patient and every medication in `medication_ids`).

+ Parameters
    + patientid (integer, required)

        unique ID of the patient (*url*)
    + date (string, required, `2015-05-31T19:27:09+00:00`)
        
        ISO 8601 combined date-time in UTC representing the date and time to be associated
        with the journal entry. Should probably allow user entry of this, but default to the time
        the user wrote the entry.

    + text (string, required)

        free-form text field.

    + medication_ids (integers, optional)

        optional list of medication IDs to 'tag' the journal entry with

    + mood (string, optional)
    
        mood of the patient as they wrote the journal entry

+ Request
    + Headers

            Authorization: Bearer ACCESS_TOKEN

    + Body
    
            {
                date: "2015-05-31T19:27:09+00:00",
                text: "Had an amazing day today, perhaps thanks in part to taking one more #Adderall than I was meant to this morning!! I #love you #Orange guys soooo much it's insane, but I should probably #go now to avoid #typing #too #much #hashtags #omgilovehashtags #Adderall",
                medication_ids: [1,4],
                mood: "Happy",
                hashtags: ["Adderall", "love", "Orange", "go", "typing", "too", "much", "hashtags", "omgilovehashtags"],
                success: true
            }

+ Response 201
    Errors
    + `access_token_required` (401) - no access token specified in
    `Authorization` header
    + `unauthorized` (403) - the current user does not have write access to this patient
    + `invalid_patient_id` (404) - a patient with the specified ID was not found
    + `invalid_access_token` (401) - the access token specified is invalid
    + `text_required` (400) - text for the journal entry must be provided
    + `date_required` (400) - a datetime for the entry must be provided
    + `invalid_date` (400) - the date given is not in valid ISO 8601 format
    + `invalid_medication_id` (400) - the medications list contains an invalid entry for which a corresponding medication cannot be found

    + Body

            {
                id: 1,
                date: "2015-05-31T19:27:09+00:00",
                text: "Had an amazing day today, perhaps thanks in part to taking one more #Adderall than I was meant to this morning!! I #love you #Orange guys soooo much it's insane, but I should probably #go now to avoid #typing #too #much #hashtags #omgilovehashtags #Adderall",
                medication_ids: [1,4],
                mood: "Happy",
                hashtags: ["Adderall", "love", "Orange", "go", "typing", "too", "much", "hashtags", "omgilovehashtags"],
                success: true
            }

### Retrieve all Entries [GET]
Get a list of all journal events for the patient. Includes full information on each,
but each medication ID in `medication_ids` is not expanded out into a full medication
object. To call this endpoint successfully, the user will need read access to the patient.
Further, each journal entry will only be shown if the user has read access to all medications
tagged in that journal entry.

+ Parameters
    + patientid (integer, required)

        unique ID of the patient (*url*)
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

        Restrict results to entries that took place after this date. Must be
        a valid ISO 8601 datetime. Defaults to 0.

    + end_date (string, optional)

        Restrict results to entries that took place before this date. Must be
        a valid ISO 8601 datetime. Defaults to infinity.

    + medication_ids (array of integers, optional)

        Restrict results to journal entries that include (at least all of) these
        medications.

    + text (string, optional)

        Restrict results to journal entries containing this text (fuzzy-matching)

+ Request
    + Headers

            Authorization: Bearer ACCESS_TOKEN

+ Response 200
    Errors
    + `access_token_required` (401) - no access token specified in
    `Authorization` header
    + `invalid_access_token` (401) - the access token specified is invalid
    + `unauthorized` (403) - the current user does not have read access to this patient
    + `invalid_patient_id` (404) - a patient with the specified ID was not found
    + `invalid_limit` (400) - the specified result limit is invalid
    + `invalid_offset` (400) - the specified result offset is invalid
    + `invalid_sort_by` (400) - the specified sort field is invalid
    + `invalid_sort_order` (400) - the specified sort order is invalid
    + `invalid_start` (400) - the specified start date is an invalid ISO 8601 datetime
    + `invalid_end` (400) - the specified end date is an invalid ISO 8601 datetime
    + `invalid_medication_id` (400) - the medications list contains an invalid entry for which a corresponding medication cannot be found

    + Body

            {
                entries: [
                    {
                        id: 1,
                        date: "2015-05-31T19:27:09+00:00",
                        text: "Had an amazing day today, perhaps thanks in part to taking one more Adderall than I was meant to this morning!! I #love you #Orange guys soooo much it's insane, but I should probably #go now to avoid #typing #too #much #hashtags #omgilovehashtags #Adderall",
                        mood: "Happy",
                        hashtags: ["Adderall", "love", "Orange", "go", "typing", "too", "much", "hashtags", "omgilovehashtags"],
                        medication_ids: [1,4]
                    },
                    ...
                ],
                count: 46,
                success: true
            }


## Journal Entry [/patients/{patientid}/journal/{journalid}]
### Retrieve One Entry [GET]
View information on an individual journal entry. `medication_ids` is helpfully
expanded out into `medications`. The current user will need read access to **both**
the patient's data and all medications tagged in `medication_ids`.

+ Parameters
    + patientid (integer, required)

        unique ID of the patient (*url*)
    + journalid (integer, required)

        unique ID of the journal entry

+ Request
    + Headers

            Authorization: Bearer ACCESS_TOKEN

+ Response 200
    Errors
    + `access_token_required` (401) - no access token specified in
    `Authorization` header
    + `invalid_access_token` (401) - the access token specified is invalid
    + `unauthorized` (403) - the current user does not have read access to this patient
    + `invalid_patient_id` (404) - a patient with the specified ID was not found
    + `invalid_journal_id` (404) - an entry with that ID was not found

    + Body

            {
                id: 1,
                date: "2015-05-31T19:27:09+00:00",
                text: "Had an amazing day today, perhaps thanks in part to taking one more Adderall than I was meant to this morning!! I #love you #Orange guys soooo much it's insane, but I should probably #go now to avoid #typing #too #much #hashtags #omgilovehashtags #Adderall",
                mood: "Happy",
                hashtags: ["Adderall", "love", "Orange", "go", "typing", "too", "much", "hashtags", "omgilovehashtags"],
                medications: [
                    {
                        id: 1,
                        name: "Loratadine",
                        rx_norm: "324026",
                        pharmacy_id: 1
                    },
                    {
                        id: 4,
                        name: "Adderall",
                        rx_norm: "123456789",
                        pharmacy_id: 7
                    }
                ],
                success: true
            }


### Change an Entry [PUT]
Change information (medications, date and/or text) of a single journal entry. The current
user will need write access to the patient, write access to every medication tagged in the
old `medication_ids` **and** write access to every medication tagged in the newly-updated
`medication_ids`.

+ Parameters
    + patientid (integer, required)

        unique ID of the patient (*url*)
    + journalid (integer, required)

        unique ID of the entry (*url*)

    + date (string, optional) - new ISO 8601 datetime to change the entry date to

    + medication_ids (array of integers, optional)

        Array of medication IDs. This will overwrite the previous list, so make sure to
        list _all_ medication IDs for the entry, not just new ones.

    + text (string, optional)

        String to change the actual text of the entry to. Cannot be blank if present.

    + mood (string, optional)
    
        mood of the patient as they wrote the journal entry

+ Request
    + Headers

            Authorization: Bearer ACCESS_TOKEN

    + Body

            {
                date: "2015-05-31T19:27:09+00:00",
                text: "Had an absolute amazeballs day today, omg I love Adderall so much it's the greatest thing ever.",
                mood: "amazeballs",
                medication_ids: [2,3,8,9,10]
            }

+ Response 200
    Errors
    + `access_token_required` (401) - no access token specified in
    `Authorization` header
    + `invalid_access_token` (401) - the access token specified is invalid
    + `unauthorized` (403) - the current user does not have write access to this patient
    + `invalid_patient_id` (404) - a patient with the specified ID was not found
    + `invalid_journal_id` (404) - a journal entry with that ID was not found
    + `invalid_date` (400) - the date field specified is not in valid ISO 8601 format
    + `text_required` (400) - if the text field is present, it cannot be blank
    + `invalid_medication_id` (400) - the medications list contains an invalid entry for which a corresponding medication cannot be found
    
    + Body

            {
                id: 1,
                date: "2015-05-31T19:27:09+00:00",
                text: "Had an absolute amazeballs day today, omg I love Adderall so much it's the greatest thing ever.",
                mood: "amazeballs",
                hashtags: [],
                medication_ids: [2,3,8,9,10]
                success: true
            }

### Delete an Entry [DELETE]
Remove a single journal entry. The current user will need write access to both the patient
and all medications tagged in `medication_ids`.

+ Parameters
    + patientid (integer, required)

        unique ID of the patient (*url*)
    + journalid (integer, required)

        unique ID of the journal entry (*url*)

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
    + `invalid_journal_id` (404) - a journal entry with that ID was not found

    + Body

            {
                id: 1,
                date: "2015-05-31T19:27:09+00:00",
                text: "Had an absolute amazeballs day today, omg I love Adderall so much it's the greatest thing ever.",
                mood: "amazeballs",
                hashtags: [],
                medication_ids: [2,3,8,9,10]
                success: true
            }


