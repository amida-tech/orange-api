# Group Habits
## Patient Habits [/patients/{patientid}/habits]
Habits are real-life *preferences* of the patient: what time they usually wake up
in the morning, what time they usually eat lunch, and so on. Exactly one set of
preferences is stored for each patient. The current user will need read access
to the patient to view the habits, and write access to set them.

Habits must be in the specific `HH:MM a` format; for example, `03:59 am` and `11:20 pm`.
These times are in the *local timezone* of the patient, and will not change if the 
timezone is updated (for example, if `breakfast` is set to `10:00 am` while the timezone
is `London/Europe`, `breakfast` will remain as `10:00 am` if the timezone is updated to
`America/New_York`. This signifies that if medication is to be taken with food at
breakfast every morning, the patient should continue doing that even if the timezone shifts).

Habits (all may be blank, and initially are after registration):
+ `wake` (*time*) - what time the patient normally wakes up in the morning
+ `sleep` (*time*) - what time the patient normally goes to sleep at night
+ `breakfast` (*time*) - what time the patient normally eats breakfast
+ `lunch` (*time*) - what time the patient normally eats lunch
+ `dinner` (*time*) - what time the patient normally eats dinner
+ `tz` (*timezone*) - the current timezone of the patient (retrieved automatically
    from the mobile OS without any user participation required). Should be a valid TZ
    database timezone (e.g., `/London/Europe`). Defaults to `Etc/UTC` (UTC time).
  
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
                wake: "07:00 am",
                sleep: "11:00 pm",
                breakfast: "08:00 am",
                lunch: "12:00 pm",
                dinner: "07:00 pm",
                tz: "Etc/UTC",
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
    + tz (timezone, optional) - the current user timezone

+ Request
    + Headers

            Authorization: Bearer ACCESS_TOKEN
    + Body

            {
                wake: "06:00 am",
                sleep: "10:00 pm",
                breakfast: "07:00 am",
                lunch: "11:00 am",
                tz: "London/Europe",
                dinner: "06:00 pm"
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
    + `invalid_tz` (400) - the timezone passed is not a valid TZ database timezone

    + Body

            {
                wake: "06:00 am",
                sleep: "10:00 pm",
                breakfast: "07:00 am",
                lunch: "11:00 am",
                dinner: "06:00 pm",
                tz: "London/Europe",
                success: true
            }

