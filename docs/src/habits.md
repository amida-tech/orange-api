# Group Habits
## Patient Habits [/patients/{patientid}/habits]
Habits are real-life *preferences* of the patient: what time they usually wake up
in the morning, what time they usually eat lunch, and so on. Exactly one set of
preferences is stored for each patient. The current user will need read access
to the patient.

Most  habits are of the `time` datatype. This means they must be in the specific
`HH:MM` format of ISO 8601; for example, `03:59` and `23:20`. These times are
in the *local timezone* of the patient, and will not change if the timezone is updated
(for example, if `breakfast` is set to `10:00` while the timezone is `London/Europe`,
`breakfast` will remain as `10:00` if the timezone is updated to `America/New_York`.
This signifies that if medication is to be taken with food at breakfast every morning,
the patient should continue doing that even if the timezone shifts).

Habits (all may be blank, and initially are after registration):
+ `wake` (*time*) - what time the patient normally wakes up in the morning
+ `sleep` (*time*) - what time the patient normally goes to sleep at night
+ `breakfast` (*time*) - what time the patient normally eats breakfast
+ `lunch` (*time*) - what time the patient normally eats lunch
+ `dinner` (*time*) - what time the patient normally eats dinner
+ `tz` (*timezone*) - the current timezone of the patient (retrieved automatically
    from the mobile OS without any user participation required). Should be a valid TZ
    database timezone (e.g., `/London/Europe`). Defaults to `Etc/UTC` (UTC time).
+ `access_anyone` (*string*) - the default access permissions that users this patient
    is shared with under the `anyone` group should have. Must be either `read` or `write`.
    Defaults to `read`.
+ `access_family` (*string*) - the default access permissions that users this patient
    is shared with under the `family` group should have. Must be either `read` or `write`.
    Defaults to `read`.
+ `access_prime` (*string*) - the default access permissions that users this patient
    is shared with under the `prime` group should have. Must be either `read` or `write`.
    Defaults to `read`.
  
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
    + access_anyone (string, optional)
    
        The access permission shared users in the `anyone` group should have. Must be
        either `read` or `write.
    + access_family (string, optional)
    
        The access permission shared users in the `family` group should have. Must be
        either `read` or `write.
    + access_prime (string, optional)
    
        The access permission shared users in the `prime` group should have. Must be
        either `read` or `write.

+ Request
    + Headers

            Authorization: Bearer ACCESS_TOKEN
    + Body

            {
                wake: "06:00",
                sleep: "22:00",
                breakfast: "07:00",
                lunch: "11:00",
                tz: "London/Europe",
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
    + `invalid_tz` (400) - the timezone passed is not a valid TZ database timezone
    + `invalid_access_anyone` (400) - the `access_anyone` value passed is not `read` or `write`
    + `invalid_access_family` (400) - the `access_family` value passed is not `read` or `write`
    + `invalid_access_prime` (400) - the `access_prime` value passed is not `read` or `write`

    + Body

            {
                wake: "06:00",
                sleep: "22:00",
                breakfast: "07:00",
                lunch: "11:00",
                dinner: "18:00",
                tz: "London/Europe",
                success: true
            }

