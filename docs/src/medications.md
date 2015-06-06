# Group Medications
Data on regular medications a patient takes (either manually entered
or retrieved via OAuth2 + FHIR from e.g., the DRE).

## Medications Collection [/patients/{patientid}/medications]
### Create a new Medication [POST]
Store details of a new medication the patient has started taking. The current user
must have write access to the patient's data.

+ Parameters
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
    + quantity (integer, optional) - number of medication in each 'pack'
    + type (string, optional) - legal medication type: e.g., `"OTC"`
    + schedule (dictionary, optional)

        Regular schedule the patient should take the medication on. There are a
        couple of discrete schedule types, each of which should be formatted
        differently. The schedule type should be passed in a `type` key:

        - As needed (`type: "as_needed"`). Can include an optional
            `not_to_exceed: INTEGER` field for the maximum number of times
            a patient should take the medication in a given day.

        - Every `n` days (so `n=1` for a daily (or more) medication and `n=7` for a weekly
            medication) (`type: "regularly"`, `frequency: n`). Can optionally include:
            - `number_of_times` (`integer`): number of times the patient should take it
                on that occurrence (most useful for medications that should be taken e.g.,
                3 times every day). If this is specified, `interval` should not be.
            - `times_of_day` (array of `string`s): the specific times of the day that the
                patient should take the medication. If both this and `number_of_times` are 
                specified, then `number_of_times` must equal the length of `times_of_day`.
                If this is specified, `interval` should not be.  Times should be formatted
                in the specific `HH:MM` format of ISO 8601, for example `03:59` and `23:20`.
                Times based on the patient's habits can be specified with the strings
                `"before_sleep"`, `"after_sleep"`, `"before_breakfast"`, `"after_breakfast"`,
                `"before_lunch"`, `"after_lunch"`, `"before_dinner"` and `"after_dinner"`
            - `interval` (`integer`): specifies a regular interval, in **minutes**, that
                the medication should be taken at. If this is specified, `times_of_day` 
                and `number_of_times` should not be.

    + doctor_id (integer, optional)

        ID of the doctor prescribing the patient's medication. This doctor
        must already exist in `/patients/:patientid/doctors`

    + pharmacy_id (integer, optional)

        ID of the pharmacy selling the patient's medication. This doctor
        must already exist in `/patients/:patientid/doctors`

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
                quantity: 50,
                type: "OTC",
                schedule: {
                    type: "regularly",
                    frequency: 1,
                    number_of_times: 2,
                    times_of_day: ["after_lunch", "before_sleep"]
                },
                doctor_id: 1,
                pharmacy_id: 1
            }

+ Response 201
    Errors
    + `access_token_required` (401) - no access token specified in
    `Authorization` header
    + `invalid_access_token` (401) - the access token specified is invalid
    + `unauthorized` (403) - the current user does not have write access to this patient
    + `invalid_patient_id` (404) - a patient with the specified ID was not found
    + `invalid_dose` (400) - medication dose specified in the format specified above
    + `invalid_quantity` (400) - quantity not a positive integer
    + `invalid_schedule` (400) - schedule is not specified in the format specified above
    + `invalid_doctor_id` (400) - a doctor with that ID was not found
    + `invalid_pharmacy_id` (400) - a pharmacy with that ID was not found

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
                quantity: 50,
                type: "OTC",
                schedule: {
                    type: "regularly",
                    frequency: 1,
                    number_of_times: 2,
                    times_of_day: ["after_lunch", "before_sleep"]
                },
                doctor_id: 1,
                pharmacy_id: 1,
                success: true
            }

### Retrieve all Medications [GET]
Get a list of all the patient's medications. Includes full information on each, but
doctor and pharmacy details are not expanded out. The current user must have read
access to the patient's data.

+ Parameters
    + limit (integer, optional)

        Maximum number of results to return. Defaults to 25.
     + offset (integer, optional)

         Number of initial results to ignore (used in combination with `limit`)
         for pagination. Defaults to 0.

    + sort_by (string, optional)
    
        Field to sort results by. Must by either `id`, `name`, `dose` or `quantity`,
        and defaults to `id`.

    + sort_order (string, optional)
    
        The order to sort results by: either `asc` or `desc`. Defaults to
        `asc`.
    + name (string, optional)

        Filter results by name of medication. Performs fuzzy matching.

    + route (string, optional)

        filter results (exactly) by ROA of medication
    + form (string, optional)

        filter results (exactly) by form of medication
    + type (string, optional)
    
        filter results (exactly) by type of medication


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
                        quantity: 50,
                        type: "OTC",
                        schedule: {
                            type: "regularly",
                            frequency: 1,
                            number_of_times: 2,
                            times_of_day: ["after_lunch", "before_sleep"]
                        },
                        doctor_id: 1,
                        pharmacy_id: 1
                    },
                    ...
                ],
                count: 7,
                success: true
            }

## Medication [/patients/{patientid}/medications/{medicationid}]
### Retrieve a Medication [GET]
View information on an individual medication. Doctor and pharmacy details are expanded out.
The current user must have read access to the patient's data.

+ Parameters
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
                quantity: 50,
                type: "OTC",
                schedule: {
                    type: "regularly",
                    frequency: 1,
                    number_of_times: 2,
                    times_of_day: ["after_lunch", "before_sleep"]
                },
                doctor: {
                    id: 1,
                    name: "Dr. Y",
                    phone: "(716) 716-7166",
                    address: "Doctor Street, DC, 20052",
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
                        }
                    }
                },
                success: true
            }

### Change a Med's Info [PUT]
Change information (all keys apart from `id`) of an individual medication. The current
user must have write access to the patient's data.

+ Parameters
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
    + quantity (integer, optional) - number of medication in each 'pack'
    + type (string, optional) - legal medication type: e.g., `"OTC"`
    + schedule (dictionary, optional)

        As in `POST`. A whole new schedule must be sent.

    + doctor_id (integer, optional) - ID of the doctor prescribing the patient's medication
    + pharmacy_id (integer, optional) - ID of the pharmacy selling the patient's medication

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
                quantity: 50,
                type: "OTC",
                schedule: {
                    type: "regularly",
                    frequency: 1,
                    number_of_times: 2,
                    times_of_day: ["after_lunch", "before_sleep"]
                },
                doctor_id: 1,
                pharmacy_id: 1
            }

+ Response 200
    Errors
    + `access_token_required` (401) - no access token specified in
    `Authorization` header
    + `invalid_access_token` (401) - the access token specified is invalid
    + `unauthorized` (403) - the current user does not have write access to this patient
    + `invalid_patient_id` (404) - a patient with the specified ID was not found
    + `invalid_dose` (400) - medication dose specified in the format specified above
    + `invalid_quantity` (400) - quantity not a positive integer
    + `invalid_schedule` (400) - schedule is not specified in the format specified above
    + `invalid_doctor_id` (400) - a doctor with that ID was not found
    + `invalid_pharmacy_id` (400) - a pharmacy with that ID was not found
    
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
                quantity: 50,
                type: "OTC",
                schedule: {
                    type: "regularly",
                    frequency: 1,
                    number_of_times: 2,
                    times_of_day: ["after_lunch", "before_sleep"]
                },
                doctor_id: 1,
                pharmacy_id: 1,
                success: true
            }


### Delete a Medication [DELETE]
Remove a single medication. The current user must have write access to the patient's
data.

+ Parameters
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
                quantity: 50,
                type: "OTC",
                schedule: {
                    type: "regularly",
                    frequency: 1,
                    number_of_times: 2,
                    times_of_day: ["after_lunch", "before_sleep"]
                },
                doctor_id: 1,
                pharmacy_id: 1,
                success: true
            }

## Medication Adherences [/patients/{patientid}/medications/{medicationid}/adherences]
### Retrieve all Adherences [GET]
Get a list of all adherence events for **this specific medication** for the
patient. Includes full information on each adherence, although for brevity
`medication_id` is filtered out of each adherence result. The current user must have
read access to the patient's data.

+ Parameters
    + medicationid (integer, required)

        unique ID of the medication (*url*)
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

        Restrict results to adherence events that took place after this date.
        Must be a valid ISO 8601 datetime. Defaults to 0.

    + end_date (string, optional)

        Restrict results to adherence events that took place before this date.
        Must be a valid ISO 8601 datetime. Defaults to infinity.

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
                        date: "2015-05-31T19:27:09+00:00",
                        notes: "Feeling sleepy now!"
                    },
                    ...
                ],
                count: 46,
                success: true
            }


