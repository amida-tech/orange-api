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

Each event item can be one of two times: `time` and `date`. `time` items represent a specific
datetime at which the medication should be taken (and are formatted as an ISO-8601 datetime
in the patient's _local_ timezone). `date` items indicate that the medication can be taken at
any time on the specified day, and have the date formatted as `YYYY-MM-DD` in the patient's
_local_ timezone.

Each event will also contain a `happened` boolean key indicating whether it took place in the
past (`true`) or will take place in the future (`false`).

Crucially, each event contains a `notification` key containing an ISO-8601 datetime in the
patient's local timezone representing the time at which the patient should be notified they need
to take their medication. This uses the **user-specific** notification settings set in
the `/patients/:patientid/medications/:medicationid/times/:timeid` endpoints (and defaults to
30 minutes prior).

The schedule also contains "as needed" events, where a dose was recorded manually by the user not
corresponding to any scheduled event. To distinguish between these and scheduled events, a `scheduled`
key is included: it is not present for "as needed" events, and is present and equal to the ID of the
scheduled time event for scheduled events.

Additionally, each event will contain the `take_with_food` (boolean or null), `take_with_medications`
(array of integers) and `take_without_medications` (array of integers) keys, each representing
the same data and formatted the same way as in the medication `schedule` field.

The schedule will also contain an overall `statistics` object, containing floats `took_medication`
(a mean average value for `took_medication` as a percentage out of 100), `delta` (a mean average
value of all of the `delay`s) and `delay` (a mean average value of the **absolute values** of all
the `delay`s). Each number in `statistics` will be `null` if there are no schedule events in
the past found (for example, if start date is in the future). As needed events are ignored when
calculating statistics.

The user will need read access to the patient to get a successful response from this endpoint.
Further, only schedule events corresponding to medications for which the user has read access
will be shown.

To view the schedule for all patient logs the user has access to (rather than just one
specific patient), make this request to `GET /schedule`. That endpoint accepts exactly the same
`start_date` and `end_date` parameters as this one, although it ignores any specified `medication_id`
parameter.

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
                        notification: "2015-03-31T18:57:09+00:00",
                        medication_id: 1,
                        took_medication: true,
                        delay: -17,
                        dose_id: 14,
                        take_with_food: true,
                        take_with_medications: [1],
                        take_without_medications: [3]
                    },
                    {
                        type: "time",
                        date: "2015-03-31T19:27:09+00:00",
                        notification: "2015-03-31T18:57:09+00:00",
                        medication_id: 1,
                        took_medication: false,
                        take_with_food: null,
                        take_with_medications: [],
                        take_without_medications: []
                    },
                    {
                        type: "time",
                        date: "2015-03-31T19:27:09+00:00",
                        notification: "2015-03-31T18:57:09+00:00",
                        medication_id: 1,
                        took_medication: false,
                        take_with_food: null,
                        take_with_medications: [],
                        take_without_medications: []
                    },
                    ... // more events that have already taken place
                    {
                        type: "time",
                        date: "2015-05-31T19:27:09+00:00",
                        notification: "2015-03-31T18:57:09+00:00",
                        medication_id: 1,
                        take_with_food: null,
                        take_with_medications: [],
                        take_without_medications: []
                    },
                    {
                        // no time specified, just the date
                        type: "date",
                        date: "2015-05-31",
                        notification: "2015-03-31T18:57:09+00:00",
                        medication_id: 3,
                        take_with_food: null,
                        take_with_medications: [],
                        take_without_medications: []
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
