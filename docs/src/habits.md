# Group Habits
## User Habits [/user/habits]
Habits are real-life *preferences* of the user: what time they usually wake up
in the morning, what time they usually eat lunch, and so on. Exactly one set of
preferences is stored for each user.

Currently all habits are of the `time` datatype. This means they must be in the
specific `HH:MM` format of ISO 8601. For example, `03:59` and `23:20`.

Habits (all may be blank, and initially are after registration):
+ `wake` (*time*) - what time the user normally wakes up in the morning
+ `sleep` (*time*) - what time the user normally goes to sleep at night
+ `breakfast` (*time*) - what time the user normally eats breakfast
+ `lunch` (*time*) - what time the user normally eats lunch
+ `dinner` (*time*) - what time the user normally eats dinner


### Get User Habits [GET]
View the user's current habits.

+ Request
    + Headers
        Authorization: Bearer ACCESS_TOKEN

+ Response 200
    Errors
    + `access_token_required` (401) - no access token specified in `Authorization`
    header
    + `invalid_access_token` (401) - the access token specified is invalid

    + Body

            {
                wake: "07:00",
                sleep: "23:00",
                breakfast: "08:00",
                lunch: "12:00",
                dinner: "19:00",
                success: true
            }

### Set User Habits [PUT]
Set the current user's habits.

+ Parameters
    + wake (time, optional) - what time the user normally wakes up in the morning
    + sleep (time, optional) - what time the user normally goes to sleep at night
    + breakfast (time, optional) - what time the user normally eats breakfast
    + lunch (time, optional) - what time the user normally eats lunch
    + dinner (time, optional) - what time the user normally eats dinner

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

