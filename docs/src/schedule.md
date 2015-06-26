# Group Schedule
## Schedule [/patients/{patientid}/schedule]
### View Schedule [GET]
Given that all medication data (including schedules in the [required format](#medications))
have been entered, this endpoint generates an easy-to-use schedule for when the patient
should take their medication over a specific date range.

If events are in the past, the schedule will contain a `took_medication` boolean indicating
whether the patient took the medication when they were required. If they did, then a
`delay` integer field will be present indicating the number of minutes late the patient was
when taking the medication. `delay` is signed: if the patient took the medication too early,
it will be negative.

The schedule will also contain an overall `statistics` object, containing floats `took_medication`
(a mean average value for `took_medication` as a percentage out of 100), `delta` (a mean average
value of all of the `delay`s) and `delay` (a mean average value of the **absolute values** of all
the `delay`s). Each number in `statistics` will be `null` if there are no schedule events in
the past found (for example, if start date is in the future).

+ Parameters
    + patientid (integer, required)

        unique ID of the patient

    + start_date (string, optional)

        Start schedule at this date. Must be a valid ISO 8601 YYYY-MM-DD date. Defaults
        to the current time.

    + end_date (string, optional)

        End schedule at this date. Must be a valid ISO 8601 YYYY-MM-DD date. Defaults to exactly
        one week later than the current time.

    + medication_id (integer, optional)

        Restricts the schedule to events for one medication only.

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
    + `invalid_medication_id` (400) - a medication with that ID was not found
    + `invalid_start` (400) - a start date not formatted correctly as YYYY-MM-DD
    + `invalid_end` (400) - an end date not formatted correctly as YYYY-MM-DD

    + Body

            // This illustrates a response when the current date falls somewhere
            // in the middle of the specified date range. In other cases, either
            // the first or second type of schedule datums would of course not be present.
            {
                schedule: [
                    {
                        type: "time",
                        date: "2015-03-31T19:27:09+00:00",
                        medication_id: 1,
                        took_medication: true,
                        delay: -17,
                        dose_id: 14
                    },
                    {
                        type: "time",
                        date: "2015-03-31T19:27:09+00:00",
                        medication_id: 1,
                        took_medication: false
                    },
                    {
                        type: "time",
                        date: "2015-03-31T19:27:09+00:00",
                        medication_id: 1,
                        took_medication: false
                    },
                    ... // more events that have already taken place
                    {
                        type: "time",
                        date: "2015-05-31T19:27:09+00:00",
                        medication_id: 1
                    },
                    {
                        // no time specified, just the date
                        type: "date",
                        date: "2015-05-31",
                        medication_id: 3
                    },
                    ... // more events in the future
                ],
                // only present if some events have already taken place
                statistics: {
                    took_medication: 70.3,
                    delay: 4,
                    delta: -1
                },
                success: true
            }
