# Group Medications
Data on regular medications a patient takes (either manually entered
or retrieved via OAuth2 + FHIR from e.g., the DRE).

Medication data responses contain the `number_left` integer key: this is an estimation
of the number of pills left based on `fill_date` and dose events submitted to the API.
It will only be non-null if `fill_date` is non-null.

### Permissions
Medications have custom permissions that are used instead of the patient-wide permissions.
Each medication has `access_anyone`, `access_family` and `access_prime` fields, each of which
can be set to `read`, `write`, `default` or `none` to control the access the relevant share
group (`anyone`, `family` or `prime`) has to the medication.

`read`, `write` and `none` are self-explanatory, but `default` is slightly more complex:
 * For an `anyone` share, `default` gives the user read-only access

 * For a `family` share on an as-needed medication (including medications that are both regular and as-needed),
   `default` gives the user write access.

 * For a `family` share on a medication that is not as-needed (so is regular-only), `default` gives the user
   read-only access.

 * For a `prime` share, `default` delegates to the patient-level permissions: it first looks at any explicit
   permissions specified in the share itself, and if that's set to `default` then it looks as `access_prime` in
   the patient data.

There is one exception to this rule. The *user* who creates a medication is recorded as the `creator` of that
medication, and they always have write access to that medication (even if, for example, the patient is shared
with the user through the `anyone` group and the medication has `access_anyone="default"` (which would usually give
them read-only access), that user will still have write access).

All three keys (`access_anyone`, `access_family` and `access_prime`) default to `default`, the recommended
permission structure.


### Schedule
Various endpoints below take and output `schedule` data items, representing a regular
schedule the patient should take a certain medication on.  These are used to schedule
reminders, and so are vitally important for the core of the app. The data format
`schedule`s must be in is precisely defined below, and must be followed exactly.

At it's core, each schedule is an object.

It must contain the `as_needed` boolean key signifying whether the medication can be
taken whenever needed (irregularly), and the `regularly` key signifying it should be
taken on a regular schedule. At least one must be true. If `regularly` is `false`, no
extra information is needed. If `regularly` is true, all of the following scheduling
data is also required.

The schedule must have an `until` key signifying when the patient should stop taking
the medication:

- In Perpetuity (forever)
```javascript
until: {
    type: "forever"
}
```

- A certain number of times before stopping
```javascript
until: {
    type: "number",
    stop: 5
}
```

- Until a certain date
```javascript
until: {
    type: "date",
    stop: "2015-05-07"
}
```

The schedule must have a `frequency` key signifying on which days the patient should take
the medication. Specific times of each day can be set using the `times` key, which is described
below. `frequency` is an object consisting of an `n` key and a `unit` key: `n` is a number
representing that the medication should be taken every `n` units, and `unit` specifies that
unit (it can be `"day"`, `"month"` or `"year"` only).

`frequency` can also have an optional `exclude` key, denoting that the medication should
sometimes be skipped. If present, `exclude` must be an object consisting of `exclude` and `repeat`
keys. `exclude` is an array of numbers representing the indices of days that must be swapped
(where the first day it should be taken on has index 0, the second day it _should be taken on_
has index 1, etc). `repeat` is a number representing the length of the exclude cycle: in other
words, indices are taken modulo this. See the examples below for illustration.

- Daily
```javascript
frequency: {
    n: 1,
    unit: "day"
}
```

- Weekdays only
```javascript
frequency: {
    n: 1,
    unit: "day",
    exclude: {
        exclude: [5, 6],
        repeat: 7
    }
}
```

- Weekly
```javascript
frequency: {
    n: 7,
    unit: "day"
}
```

- Every 28 days
```javascript
frequency: {
    n: 28,
    unit: "day"
}
```

- Monthly
```javascript
frequency: {
    n: 1,
    unit: "month"
}
```

- Quarterly
```javascript
frequency: {
    n: 3,
    unit: "month"
}
```

- Quarterly apart from last quarter
```javascript
frequency: {
    n: 3,
    unit: "month",
    exclude: {
        exclude: [3],
        repeat: 4
    }
}
```

`frequency` can also include a `start` key: a `YYYY-MM-DD` formatted (local) date representing
any date that the medication was taken on (for example, the date the medication was started on).
This means that, for example, Orange knows which day of the week a weekly medication is taken on.
`start` can either be a string or an array of strings.

For example, a `start` array can be used to represent a medication that should be taken on the 1st
and the 15th of every month
```javascript
frequency: {
    n: 1,
    unit: "month",
    start: [
        "2015-01-01",
        "2015-01-15"
    ]
}
```

The schedule must also include a `times` key representing the times of the day the medication
is taken on (i.e., `frequency` dictates which days and `times` dictates which times on those days).
The number of times the medication is taken each day should not be explicitly specified, this is instead
calculated from the length of `times`. `times` should be an array consisting of objects, each representing
a time of the day at which the medication should be taken. There are 3 different types:

- Any time of the day
```javascript
{
    type: "unspecified"
}
```

- An exact time (`time` should be formatted `HH:MM a` in local time)
```javascript
{
    type: "exact",
    time: "09:00 am"
}
```

- A time based on the user's habits. `event` can be either `"breakfast"`, `"lunch"`, `"dinner"` or `"sleep"`. `when` can be either `"before"` or `"after"`.
```javascript
{
    type: "event",
    event: "lunch",
    when: "before"
}
```

When sent to the API, each `time` will be given an ID that will be returned in all endpoints returning
the medication schedule. These IDs can be used in the `/medications/:medicationid/times/:timeid` endpoint
to set notification settings on a user-specific basis for that specific time in that specific medication
schedule.

The schedule must also include a `take_with_food` key. This is a boolean specifying whether
or not the medication must be taken with food. `true` means it must be taken with food, `false` means
it must not be taken with food, and `null` means it does not matter. Note that `false` means
the medication **must not** be taken with food, not that it just doesn't matter. So if unknown,
`take_with_food` should be `null`.

Finally the schedule must include `take_with_medications` and `take_without_medications` keys. These
should be arrays of integers that are the IDs of medications with which this medication must (or must not)
be taken simultaneously with. If there are no medications like this, they should both be `[]`.

Note that each medication object is also returned from the API with `schedule_summary` string field,
containing human-readable text representing the schedule the medication should be taken on (e.g,.
`"Daily until 7/30/15"`). `schedule_summary` will not denote whether the medication is as-needed unless it is
as-needed only, in which case it will say `"As needed only"`.

## Medications Collection [/patients/{patientid}/medications]
### Create a new Medication [POST]
Store details of a new medication the patient has started taking. The current user
must have write access to the patient.

If `origin="imported"` and `import_id` is set, then the API will look for an existing
medication with the same `import_id`. If one exists then it will be updated with the specified
details, rather than a new medication created. This can be used to merge medication details when
running an import process in the app multiple times.

+ Parameters
    + patientid (integer, required)

        unique ID of the patient (*url*)
    + name (string, required) - human-formatted name of the medication
    + rx_norm (string, optional) - rxNorm ID code for the medication
    + ndc (string, optional) - NDC ID code for the medication
    + dose (dictionary, optional)
        
        Dose of medication the patient should take. Formatted as
        `{quantity: QUANTITY, unit: UNIT}` where `QUANTITY` is numeric
        and `UNIT` is a string (e.g., `"mg"`)
    + route (string, optional) - ROA of medication
    + form (string, optional, `pill`) - form of medication
    + rx_number (string, optional) - RX control number of the prescription
    + fill_date (string, optional)

        ISO 8601 YYYY-MM-DD in local time of the last date the medication was filled
    + quantity (integer, optional) - number of medication in each 'pack'
    + type (string, optional) - legal medication type: e.g., `"OTC"`
    + brand (string, optional) - brand name of medication
    + origin (string, optional)

        Optional string containing the source the medication data came from. Suggested use
        case would be to store either `"manual"` or `"imported"` in this field for each
        medication, although note that no backend API validation is done of this field so any
        string value can be set.
    + import_id (integer, optional)

        Optional integer representing a unique ID for an imported medication in the imported data
        source (for example, the `id` field in the DRE/another FHIR API). If a medication with
        the same `import_id` value already exists, and `origin="imported"`, then the existing
        medication will be updated with the new info, rather than a new medication created.
    + schedule (dictionary, optional) - a schedule datum in the form described above
    + access_prime (string, optional)

        The access permissions users in the `prime` group should have to this medication,
        overriding the patient-wide permissions. Must be either `read`, `write`, `none`
        or `default`. Defaults to `default`.
    + access_family (string, optional)

        The access permissions users in the `family` group should have to this medication,
        overriding the patient-wide permissions. Must be either `read`, `write`, `none`
        or `default`. Defaults to `default`.
    + access_anyone (string, optional)

        The access permissions users in the `anyone` group should have to this medication,
        overriding the patient-wide permissions. Must be either `read`, `write`, `none`
        or `default`. Defaults to `default`.
    + doctor_id (integer, optional)

        ID of the doctor prescribing the patient's medication. This doctor
        must already exist in `/patients/:patientid/doctors`

    + pharmacy_id (integer, optional)

        ID of the pharmacy selling the patient's medication. This doctor
        must already exist in `/patients/:patientid/doctors`
    + notes (string, optional)

        Optional freeform notes field for the medication.

+ Request
    + Headers

            Authorization: Bearer ACCESS_TOKEN

    + Body

            {
                name: "Loratadine",
                rx_norm: "324026",
                ndc: "33261-0228",
                dose: {
                    quantity: 100,
                    unit: "mg"
                },
                route: "oral",
                form: "pill",
                rx_number: "123456789",
                fill_date: "2015-05-01",
                quantity: 50,
                type: "OTC",
                brand: "Claritin",
                origin: "manual",
                schedule: {
                    as_needed: false,
                    regularly: true,
                    until: { type: "forever" },
                    frequency: { n: 1, unit: "day" },
                    times: [
                        { type: "event", event: "breakfast", when: "before" },
                        { type: "event", event: "breakfast", when: "after" },
                        { type: "event", event: "lunch", when: "before" },
                        { type: "event", event: "lunch", when: "after" },
                        { type: "event", event: "dinner", when: "before" },
                        { type: "event", event: "dinner", when: "after" },
                        { type: "event", event: "sleep", when: "before" },
                        { type: "event", event: "sleep", when: "after" },
                        { type: "exact", time: "09:00" },
                        { type: "exact", time: "21:30" },
                        { type: "unspecified" }
                    ],
                    take_with_food: null,
                    take_with_medications: [],
                    take_without_medications: []
                },
                access_anyone: "default",
                access_family: "default",
                access_prime: "default",
                doctor_id: 1,
                pharmacy_id: 1,
                notes: "Love this med!!"
            }

+ Response 201
    Errors
    + `access_token_required` (401) - no access token specified in
    `Authorization` header
    + `invalid_access_token` (401) - the access token specified is invalid
    + `unauthorized` (403) - the current user does not have write access to this patient
    + `invalid_patient_id` (404) - a patient with the specified ID was not found
    + `name_required` (400) - medication must have a non-blank name
    + `invalid_dose` (400) - medication dose specified in the format specified above
    + `invalid_quantity` (400) - quantity not a positive integer
    + `invalid_fill_date` (400) - fill date is not a YYYY-MM-DD date
    + `invalid_schedule` (400) - schedule is not specified in the format specified above
    + `invalid_access_anyone` (400) - the `access_anyone` field, if passed, must be either `read`, `write`, `default` or `none`
    + `invalid_access_family` (400) - the `access_family` field, if passed, must be either `read`, `write`, `default` or `none`
    + `invalid_access_prime` (400) - the `access_prime` field, if passed, must be either `read`, `write`, `default` or `none`
    + `invalid_doctor_id` (400) - a doctor with that ID was not found
    + `invalid_pharmacy_id` (400) - a pharmacy with that ID was not found
    + `invalid_import_id` (400) - the `import_id` value was invalid (must be `undefined`, `null` or an integer)

    + Body

            {
                id: 1,
                name: "Loratadine",
                rx_norm: "324026",
                ndc: "33261-0228",
                dose: {
                    quantity: 100,
                    unit: "mg"
                },
                route: "oral",
                form: "pill",
                rx_number: "123456789",
                fill_date: "2015-05-01",
                number_left: 17,
                quantity: 50,
                type: "OTC",
                brand: "Claritin",
                origin: "manual",
                schedule: {
                    as_needed: false,
                    regularly: true,
                    until: { type: "forever" },
                    frequency: { n: 1, unit: "day" },
                    times: [
                        { id: 1, type: "event", event: "breakfast", when: "before" },
                        { id: 2, type: "event", event: "breakfast", when: "after" },
                        { id: 3, type: "event", event: "lunch", when: "before" },
                        { id: 4, type: "event", event: "lunch", when: "after" },
                        { id: 5, type: "event", event: "dinner", when: "before" },
                        { id: 6, type: "event", event: "dinner", when: "after" },
                        { id: 7, type: "event", event: "sleep", when: "before" },
                        { id: 8, type: "event", event: "sleep", when: "after" },
                        { id: 9, type: "exact", time: "09:00" },
                        { id: 10, type: "exact", time: "21:30" },
                        { id: 11, type: "unspecified" }
                    ],
                    take_with_food: null,
                    take_with_medications: [],
                    take_without_medications: []
                },
                schedule_summary: "Daily",
                access_anyone: "default",
                access_family: "default",
                access_prime: "default",
                doctor_id: 1,
                pharmacy_id: 1,
                notes: "Love this med!!",
                success: true
            }

### Retrieve all Medications [GET]
Get a list of all the patient's medications. Includes full information on each, but
doctor and pharmacy details are not expanded out. To get a successful response from
this endpoint, the current user must have read access to the patient. Further, only
medications for which the current user has read access will be returned.

+ Parameters
    + patientid (integer, required)

        unique ID of the patient
    + limit (integer, optional)

        Maximum number of results to return. Defaults to 25.
    + offset (integer, optional)

         Number of initial results to ignore (used in combination with `limit`)
         for pagination. Defaults to 0.

    + sort_by (string, optional)
    
        Field to sort results by. Must by either `id` or `name`, and defaults to `id`.

    + sort_order (string, optional)
    
        The order to sort results by: either `asc` or `desc`. Defaults to
        `asc`.
    + name (string, optional)

        Filter results by name of medication. Performs fuzzy matching.

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

    + Body

            {
                medications: [
                    {
                        id: 1,
                        name: "Loratadine",
                        rx_norm: "324026",
                        ndc: "33261-0228",
                        dose: {
                            quantity: 100,
                            unit: "mg"
                        },
                        route: "oral",
                        form: "pill",
                        rx_number: "123456789",
                        fill_date: "2015-05-01",
                        number_left: 17,
                        quantity: 50,
                        type: "OTC",
                        brand: "Claritin",
                        origin: "manual",
                        schedule: {
                            as_needed: false,
                            regularly: true,
                            until: { type: "forever" },
                            frequency: { n: 1, unit: "day" },
                            times: [
                                { id: 1, type: "event", event: "breakfast", when: "before" },
                                { id: 2, type: "event", event: "breakfast", when: "after" },
                                { id: 3, type: "event", event: "lunch", when: "before" },
                                { id: 4, type: "event", event: "lunch", when: "after" },
                                { id: 5, type: "event", event: "dinner", when: "before" },
                                { id: 6, type: "event", event: "dinner", when: "after" },
                                { id: 7, type: "event", event: "sleep", when: "before" },
                                { id: 8, type: "event", event: "sleep", when: "after" },
                                { id: 9, type: "exact", time: "09:00" },
                                { id: 10, type: "exact", time: "21:30" },
                                { id: 11, type: "unspecified" }
                            ],
                            take_with_food: null,
                            take_with_medications: [],
                            take_without_medications: []
                        },
                        schedule_summary: "Daily",
                        access_anyone: "default",
                        access_family: "default",
                        access_prime: "default",
                        doctor_id: 1,
                        pharmacy_id: 1,
                        notes: "Love this med!!"
                    },
                    ...
                ],
                count: 7,
                success: true
            }

## Medication [/patients/{patientid}/medications/{medicationid}]
### Retrieve a Medication [GET]
View information on an individual medication. Doctor and pharmacy details are expanded out.
The current user must have read access to **both** the patient and the medication.

+ Parameters
    + patientid (integer, required)

        unique ID of the patient
    + medicationid (integer, required)

        unique ID of the medication

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
    + `invalid_medication_id` (404) - a medication with that ID was not found

    + Body

            {
                id: 1,
                name: "Loratadine",
                rx_norm: "324026",
                ndc: "33261-0228",
                dose: {
                    quantity: 100,
                    unit: "mg"
                },
                route: "oral",
                form: "pill",
                rx_number: "123456789",
                fill_date: "2015-05-01",
                number_left: 17,
                quantity: 50,
                type: "OTC",
                brand: "Claritin",
                origin: "manual",
                schedule: {
                    as_needed: false,
                    regularly: true,
                    until: { type: "forever" },
                    frequency: { n: 1, unit: "day" },
                    times: [
                        { id: 1, type: "event", event: "breakfast", when: "before" },
                        { id: 2, type: "event", event: "breakfast", when: "after" },
                        { id: 3, type: "event", event: "lunch", when: "before" },
                        { id: 4, type: "event", event: "lunch", when: "after" },
                        { id: 5, type: "event", event: "dinner", when: "before" },
                        { id: 6, type: "event", event: "dinner", when: "after" },
                        { id: 7, type: "event", event: "sleep", when: "before" },
                        { id: 8, type: "event", event: "sleep", when: "after" },
                        { id: 9, type: "exact", time: "09:00" },
                        { id: 10, type: "exact", time: "21:30" },
                        { id: 11, type: "unspecified" }
                    ],
                    take_with_food: null,
                    take_with_medications: [],
                    take_without_medications: []
                },
                schedule_summary: "Daily",
                access_anyone: "default",
                access_family: "default",
                access_prime: "default",
                doctor: {
                    id: 1,
                    name: "Dr. Y",
                    phone: "(716) 716-7166",
                    address: "Doctor Street, DC, 20052",
                    notes: "Love this doc the most!",
                    success: true
                },
                pharmacy: {
                    name: "Pharmacy X",
                    address: "Pharmacy Street, DC, 20052"
                    phone: "(617) 617-6177",
                    hours: {
                        monday: {
                            open: "0900",
                            close: "1700"
                        },
                        tuesday: {
                            open: "0900",
                            close: "1700"
                        },
                        wednesday: {
                            open: "0900",
                            close: "1700"
                        },
                        thursday: {
                            open: "0900",
                            close: "1700"
                        },
                        friday: {
                            open: "0900",
                            close: "1700"
                        },
                        saturday: {
                            open: "0900",
                            close: "1700"
                        },
                        sunday: {
                            open: "0900",
                            close: "1700"
                        },
                        notes: "Great pharmacy! Love the smell"
                    },
                    notes: "Love this med!!"
                },
                success: true
            }

### Change a Med's Info [PUT]
Change information (all keys apart from `id`) of an individual medication. The current
user must have read access to the patient and write access to the medication.

+ Parameters
    + patientid (integer, required)

        unique ID of the patient (*url*)
    + medicationid (integer, required)

        unique ID of the medication (*url*)
    + name (string, optional) - human-formatted name of the medication
    + rx_norm (string, optional) - rxNorm ID code for the medication
    + ndc (string, optional) - NDC ID code for the medication
    + dose (dictionary, optional)

        As in `POST`. A whole new dictionary must be sent.

    + route (string, optional) - ROA of medication
    + form (string, optional, `pill`) - form of medication
    + rx_number (string, optional) - RX control number of the prescription
    + fill_date (string, optional)

        ISO 8601 YYYY-MM-DD in local time of the last date the medication was filled
    + quantity (integer, optional) - number of medication in each 'pack'
    + type (string, optional) - legal medication type: e.g., `"OTC"`
    + brand (string, optional) - brand name of medication
    + origin (string, optional)

        Place the data for this medication came from (suggested use case: store either `"manual"`
        or `"imported"` in this field, although the API does no validation of the string contents)
    + import_id (integer, optional)

        The original ID of the medication in the data source it was imported from. Updating `import_id`
        here will not cause any merges, but when new medications are created at the `POST` endpoint they
        will compare to the updated `import_id` value.
    + schedule (dictionary, optional)

        As in `POST`. A whole new schedule must be sent.
    + access_prime (string, optional)

        The access permissions users in the `prime` group should have to this medication,
        overriding the patient-wide permissions. Must be either `read`, `write`, `none`
        or `default`. Defaults to `default`.
    + access_family (string, optional)

        The access permissions users in the `family` group should have to this medication,
        overriding the patient-wide permissions. Must be either `read`, `write`, `none`
        or `default`. Defaults to `default`.
    + access_anyone (string, optional)

        The access permissions users in the `anyone` group should have to this medication,
        overriding the patient-wide permissions. Must be either `read`, `write`, `none`
        or `default`. Defaults to `default`.
    + doctor_id (integer, optional) - ID of the doctor prescribing the patient's medication
    + pharmacy_id (integer, optional) - ID of the pharmacy selling the patient's medication
    + notes (string, optional) - freeform notes field for the medication.

+ Request
    + Headers

            Authorization: Bearer ACCESS_TOKEN

    + Body

            {
                name: "Fexofenadine",
                rx_norm: "12345",
                ndc: "1234-6789",
                dose: {
                    quantity: 120,
                    unit: "mg"
                },
                route: "oral",
                form: "pill",
                rx_number: "123456789",
                fill_date: "2015-05-01",
                quantity: 50,
                type: "OTC",
                brand: "Claritin",
                origin: "manual",
                schedule: {
                    as_needed: true,
                    regularly: false
                },
                access_anyone: "write",
                access_family: "write",
                access_prime: "write",
                doctor_id: 1,
                pharmacy_id: 1,
                notes: "Great!"
            }

+ Response 200
    Errors
    + `access_token_required` (401) - no access token specified in
    `Authorization` header
    + `invalid_access_token` (401) - the access token specified is invalid
    + `unauthorized` (403) - the current user does not have write access to this patient
    + `invalid_patient_id` (404) - a patient with the specified ID was not found
    + `name_required` (400) - medication must have a non-blank name
    + `invalid_dose` (400) - medication dose specified in the format specified above
    + `invalid_quantity` (400) - quantity not a positive integer
    + `invalid_fill_date` (400) - fill date is not a YYYY-MM-DD date
    + `invalid_schedule` (400) - schedule is not specified in the format specified above
    + `invalid_access_anyone` (400) - the `access_anyone` field, if passed, must be either `read`, `write`, `default` or `none`
    + `invalid_access_family` (400) - the `access_family` field, if passed, must be either `read`, `write`, `default` or `none`
    + `invalid_access_prime` (400) - the `access_prime` field, if passed, must be either `read`, `write`, `default` or `none`
    + `invalid_doctor_id` (400) - a doctor with that ID was not found
    + `invalid_pharmacy_id` (400) - a pharmacy with that ID was not found
    + `invalid_import_id` (400) - the `import_id` value was invalid (must be `undefined`, `null` or an integer)
    
    + Body

            {
                id: 1,
                name: "Fexofenadine",
                rx_norm: "12345",
                ndc: "1234-6789",
                dose: {
                    quantity: 120,
                    unit: "mg"
                },
                route: "oral",
                form: "pill",
                rx_number: "123456789",
                fill_date: "2015-05-01",
                number_left: 17,
                quantity: 50,
                type: "OTC",
                brand: "Claritin",
                origin: "manual",
                schedule: {
                    as_needed: true,
                    regularly: false
                },
                access_anyone: "write",
                access_family: "write",
                access_prime: "write",
                doctor_id: 1,
                pharmacy_id: 1,
                notes: "Great!",
                success: true
            }


### Delete a Medication [DELETE]
Remove a single medication. The current user must have read access to the patient and
write access to the medication.

+ Parameters
    + patientid (integer, required)

        unique ID of the patient (*url*)
    + medicationid (integer, required)

        unique ID of the medication (*url*)

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
    + `invalid_medication_id` (404) - a medication with that ID was not found

    + Body

            {
                id: 1,
                name: "Loratadine",
                rx_norm: "324026",
                ndc: "33261-0228",
                dose: {
                    quantity: 100,
                    unit: "mg"
                },
                route: "oral",
                form: "pill",
                rx_number: "123456789",
                fill_date: "2015-05-01",
                number_left: 17,
                quantity: 50,
                type: "OTC",
                brand: "Claritin",
                origin: "manual",
                schedule: {
                    as_needed: false,
                    regularly: true,
                    until: { type: "forever" },
                    frequency: { n: 1, unit: "day" },
                    times: [
                        { id: 1, type: "event", event: "breakfast", when: "before" },
                        { id: 2, type: "event", event: "breakfast", when: "after" },
                        { id: 3, type: "event", event: "lunch", when: "before" },
                        { id: 4, type: "event", event: "lunch", when: "after" },
                        { id: 5, type: "event", event: "dinner", when: "before" },
                        { id: 6, type: "event", event: "dinner", when: "after" },
                        { id: 7, type: "event", event: "sleep", when: "before" },
                        { id: 8, type: "event", event: "sleep", when: "after" },
                        { id: 9, type: "exact", time: "09:00" },
                        { id: 10, type: "exact", time: "21:30" },
                        { id: 11, type: "unspecified" }
                    ],
                    take_with_food: null,
                    take_with_medications: [],
                    take_without_medications: []
                },
                schedule_summary: "Daily",
                access_anyone: "write",
                access_family: "write",
                access_prime: "write",
                doctor_id: 1,
                pharmacy_id: 1,
                notes: "Great!",
                success: true
            }

## Medication Time [/patients/{patientid}/medications/{medicationid}/times/{timeid}]
This endpoint represents a single 'abstract' time at which the schedule indicates a medication
should be taken: i.e., one item in the `times` array of a medication. This endpoint should be
used to both view and set the notification settings for this specific medication time, both at a
a default user-wide level (the `default` key) and specifically for this *user* (**not** patient)
(the `user` key).

Both keys represent an 'offset': the number of minutes before the medication should be scheduled
at which the user should be notified they need to take the med. For example, if `user = 5` and
`default = 30` then the current user will get a notification 5 minutes before the med should be taken,
and all other users (unless they have set their own notification settings) will get a notification
30 minutes before. Values will default to 30 minutes before.

The user key can be the string `default` to represent that that user has not set a custom offset
and the default should be respected.

Both the user and/or default key can be the string `paused` to represent that the user has paused
notification for that medication (but is still taking the medication, they just don't want to receive
notifications about it).

### View Notification Settings [GET]
View the current notification settings for the current user and the global user-wide default

+ Parameters
    + patientid (integer, required)

        unique ID of the patient
    + medicationid (integer, required)

        unique ID of the medication
    + timeid (integer, required)

        unique ID of the medication time

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
    + `invalid_medication_id` (404) - a medication with that ID was not found
    + `invalid_time_id` (404) - a time with that ID was not found for that medication

    + Body

            {
                default: 30,
                user: "default",
                success: true
            }

### Set Notification Settings [PUT]
Set the current notification settings for the current user and the global user-wide default

+ Parameters
    + patientid (integer, required)

        unique ID of the patient (*url)
    + medicationid (integer, required)

        unique ID of the medication (*url)
    + timeid (integer, required)

        unique ID of the medication time (*url)
    + default (number, optional)

        number of minutes to change the notification offset to for all users who haven't set
        a custom value, or `"paused"` to disable notifications
    + user (number or string, optional)

        number of minutes to change the notification offset to for this user, or `"default"`
        to indicate that the default value should be used, or `"paused"` to disable notifications

+ Request
    + Headers

            Authorization: Bearer ACCESS_TOKEN

    + Body

            {
                default: 20,
                user: 15
            }

+ Response 200
    Errors
    + `access_token_required` (401) - no access token specified in
    `Authorization` header
    + `invalid_access_token` (401) - the access token specified is invalid
    + `unauthorized` (403) - the current user does not have read access to this patient
    + `invalid_patient_id` (404) - a patient with the specified ID was not found
    + `invalid_medication_id` (404) - a medication with that ID was not found
    + `invalid_time_id` (404) - a time with that ID was not found for that medication
    + `invalid_default` (400) - invalid `default` value (must be a positive number)
    + `invalid_user` (400) - invalid `user` value (must be a positive number or `"default"`)

    + Body

            {
                default: 20,
                user: 15,
                success: true
            }
