# Group Habits
## Patient Habits [/patients/{patientid}/habits]
Habits are real-life *preferences* of the patient: what time they usually wake up
in the morning, what time they usually eat lunch, and so on. Exactly one set of
preferences is stored for each patient. The current user will need read access
to the patient.

Currently all habits are of the `time` datatype. This means they must be in the
specific `HH:MM` format of ISO 8601. For example, `03:59` and `23:20`.

Habits (all may be blank, and initially are after registration):
+ `wake` (*time*) - what time the patient normally wakes up in the morning
+ `sleep` (*time*) - what time the patient normally goes to sleep at night
+ `breakfast` (*time*) - what time the patient normally eats breakfast
+ `lunch` (*time*) - what time the patient normally eats lunch
+ `dinner` (*time*) - what time the patient normally eats dinner


### Get Patient Habits [GET]
View the patient's current habits.

+ Parameters
    + patientid (integer, required)

        unique ID of the patient (*url*)

+ Request
    + Headers

            Authorization: Bearer ACCESS_TOKEN

+ Response 200
    Errors
    + `access_token_required` (401) - no access token specified in `Authorization`
    header
    + `invalid_access_token` (401) - the access token specified is invalid
    + `unauthorized` (403) - the current user does not have read access to this patient
    + `invalid_patient_id` (404) - a patient with the specified ID was not found

    + Body

            {
                wake: "07:00",
                sleep: "23:00",
                breakfast: "08:00",
                lunch: "12:00",
                dinner: "19:00",
                success: true
            }

### Set Patient Habits [PUT]
Set the patient's habits. The current user will need write access to the patient.

+ Parameters
    + patientid (integer, required)

        unique ID of the patient (*url*)
    + wake (time, optional) - what time the patient normally wakes up in the morning
    + sleep (time, optional) - what time the patient normally goes to sleep at night
    + breakfast (time, optional) - what time the patient normally eats breakfast
    + lunch (time, optional) - what time the patient normally eats lunch
    + dinner (time, optional) - what time the patient normally eats dinner

+ Request
    + Headers

            Authorization: Bearer ACCESS_TOKEN
    + Body

            {
                wake: "06:00",
                sleep: "22:00",
                breakfast: "07:00",
                lunch: "11:00",
                dinner: "18:00"
            }

+ Response 200
    Errors
    + `access_token_required` (401) - no access token specified in `Authorization`
    header
    + `unauthorized` (403) - the current user does not have read access to this patient
    + `invalid_patient_id` (404) - a patient with the specified ID was not found
    + `invalid_access_token` (401) - the access token specified is invalid
    + `invalid_wake` (400) - the wake time passed is not formatted as `HH:MM`
    + `invalid_sleep` (400) - the wake time passed is not formatted as `HH:MM`
    + `invalid_breakfast` (400) - the wake time passed is not formatted as `HH:MM`
    + `invalid_lunch` (400) - the wake time passed is not formatted as `HH:MM`
    + `invalid_dinner` (400) - the wake time passed is not formatted as `HH:MM`

    + Body

            {
                wake: "06:00",
                sleep: "22:00",
                breakfast: "07:00",
                lunch: "11:00",
                dinner: "18:00",
                success: true
            }

