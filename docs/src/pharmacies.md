# Group Pharmacies
Details for all pharmacies from whom the selected patient receives medication.

## Pharmacies Collection [/patients/{patientid}/pharmacies]
### Create a Pharmacy [POST]
Store details of a new pharmacy. The current user will need write access to the
patient.

+ Parameters
    + patientid (integer, required)

        unique ID of the patient (*url*)
    + name (string, required) - name of the pharmacy
    + address (string, optional)

        Postal address of the pharmacy. Newlines can optionally be used to split
        lines.
    + phone (string, optional) - contact phone number for the pharmacy
    + hours (dictionary, optional)
    
        The hours the pharmacy is open. Keys are full lowercase names of the days of
        the week (e.g., `monday`), and values are themselves dictionaries of the form
        `{open: OPEN_TIME, close: CLOSE_TIME}`, where times are formatted in the `HH:MM`
        format specified in ISO 8601. These hours should be in the local timezone of
        the patient.
    + notes (string, optional) - freeform text notes about the pharmacy by the patient

+ Request
    + Headers

            Authorization: Bearer ACCESS_TOKEN

    + Body
        
            {
                name: "Pharmacy X",
                address: "Pharmacy Street, DC, 20052"
                phone: "(617) 617-6177",
                hours: {
                    monday: {
                        open: "09:00",
                        close: "17:00"
                    },
                    tuesday: {
                        open: "09:00",
                        close: "17:00"
                    },
                    wednesday: {
                        open: "09:00",
                        close: "17:00"
                    },
                    thursday: {
                        open: "09:00",
                        close: "17:00"
                    },
                    friday: {
                        open: "09:00",
                        close: "17:00"
                    },
                    saturday: {
                        open: "09:00",
                        close: "17:00"
                    },
                    sunday: {
                        open: "09:00",
                        close: "17:00"
                    }
                },
                notes: "Great pharmacy! Love the smell"
            }

+ Response 201
    Errors
    + `access_token_required` (401) - no access token specified in
    `Authorization` header
    + `invalid_access_token` (401) - the access token specified is invalid
    + `unauthorized` (403) - the current user does not have write access to this patient
    + `invalid_patient_id` (404) - a patient with the specified ID was not found
    + `name_required` (400) - a non-blank name must be provided
    + `invalid_hours` (400) - the opening/closing hours dictionary is not in the
    form specified above

    + Body

            {
                id: 1,
                name: "Pharmacy X",
                address: "Pharmacy Street, DC, 20052"
                phone: "(617) 617-6177",
                hours: {
                    monday: {
                        open: "09:00",
                        close: "17:00"
                    },
                    tuesday: {
                        open: "09:00",
                        close: "17:00"
                    },
                    wednesday: {
                        open: "09:00",
                        close: "17:00"
                    },
                    thursday: {
                        open: "09:00",
                        close: "17:00"
                    },
                    friday: {
                        open: "09:00",
                        close: "17:00"
                    },
                    saturday: {
                        open: "09:00",
                        close: "17:00"
                    },
                    sunday: {
                        open: "09:00",
                        close: "17:00"
                    }
                },
                notes: "Great pharmacy! Love the smell",
                success: true
            }

### Retrieve all Pharmacies [GET]
Get a list of all the patient's pharmacies. Includes full information on each.. The current
user will need read access to the patient.

+ Parameters
    + patientid (integer, required)

        unique ID of the patient 
    + limit (integer, optional)

        Maximum number of results to return. Defaults to 25.

     + offset (integer, optional)

         Number of initial results to ignore (used in combination with `limit`)
         for pagination. Defaults to 0.

    + sort_by (string, optional)
    
        Field to sort results by. Must by either `id` or `name`, and defaults
        to `id`.

    + sort_order (string, optional)
    
        The order to sort results by: either `asc` or `desc`. Defaults to
        `asc`.

    + name (string, optional)

        Filter results by name of pharmacy. Performs fuzzy matching.

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
                pharmacies: [
                    {
                        id: 1,
                        name: "Pharmacy X",
                        ...
                    },
                    ...
                ],
                count: 3,
                success: true
            }


## Pharmacy [/patients/{patientid}/pharmacies/{pharmacyid}]
### Retrieve a Pharmacy [GET]
View information on an individual pharmacy. The current user will need read access
to the patient.

+ Parameters
    + patientid (integer, required)

        unique ID of the patient 
    + pharmacyid (integer, required)

        unique ID of the pharmacy

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
    + `invalid_pharmacy_id` (404) - a pharmacy with that ID was not found

    + Body

            {
                id: 1,
                name: "Pharmacy X",
                address: "Pharmacy Street, DC, 20052"
                phone: "(617) 617-6177",
                hours: {
                    monday: {
                        open: "09:00",
                        close: "17:00"
                    },
                    tuesday: {
                        open: "09:00",
                        close: "17:00"
                    },
                    wednesday: {
                        open: "09:00",
                        close: "17:00"
                    },
                    thursday: {
                        open: "09:00",
                        close: "17:00"
                    },
                    friday: {
                        open: "09:00",
                        close: "17:00"
                    },
                    saturday: {
                        open: "09:00",
                        close: "17:00"
                    },
                    sunday: {
                        open: "09:00",
                        close: "17:00"
                    }
                },
                notes: "Great pharmacy! Love the smell",
                success: true
            }

### Change a Pharmacy's Info [PUT]
Change information (name, phone, address and/or hours) of an individual pharmacy. The
current user will need write access to the patient.

+ Parameters
    + patientid (integer, required)

        unique ID of the patient  (*url*)
    + pharmacyid (integer, required)

        unique ID of the pharmacy (*url*)
    + name (string, optional) 

        Name of the pharmacy. Must not be blank.

    + phone (string, optional) - contact phone number for the pharmacy
    + address (string, optional) - postal address, in the format specified in `POST`
    + hours (dictionary, optional)

        Opening/closing hours, in the format specified in `POST`. The dictionary can
        be partially empty.
    + notes (string, optional) - freeform text notes about the pharmacy by the patient

+ Request
    + Headers

            Authorization: Bearer ACCESS_TOKEN

    + Body

            {
                name: "Pharmacy. Y",
                phone: "(716) 716-7166",
                address: "Pharmacy Street, DC, 20052",
                hours: {
                    tuesday: {
                        open: "10:00"
                    }
                },
                notes: "Doesn't smell like it used to"
            }

+ Response 200
    Errors
    + `access_token_required` (401) - no access token specified in
    `Authorization` header
    + `invalid_access_token` (401) - the access token specified is invalid
    + `unauthorized` (403) - the current user does not have write access to this patient
    + `invalid_patient_id` (404) - a patient with the specified ID was not found
    - `invalid_hours` (400) - the opening/closing hours dictionary is not in the
    form specified above in `POST`
    + `invalid_pharmacy_id` (404) - a pharmacy with that ID was not found
    + `name_required` (400) - the name cannot be changed to a blank name
    
    + Body

            {
                id: 1,
                name: "Pharmacy Y",
                address: "Pharmacy Street, DC, 20052"
                phone: "(716) 716-7166",
                hours: {
                    monday: {
                        open: "09:00",
                        close: "17:00"
                    },
                    tuesday: {
                        open: "10:00",
                        close: "17:00"
                    },
                    wednesday: {
                        open: "09:00",
                        close: "17:00"
                    },
                    thursday: {
                        open: "09:00",
                        close: "17:00"
                    },
                    friday: {
                        open: "09:00",
                        close: "17:00"
                    },
                    saturday: {
                        open: "09:00",
                        close: "17:00"
                    },
                    sunday: {
                        open: "09:00",
                        close: "17:00"
                    }
                },
                notes: "Doesn't smell like it used to",
                success: true
            }

### Delete a Pharmacy [DELETE]
Remove information on a single pharmacy. The current user will need write access to
the patient.

+ Parameters
    + patientid (integer, required)

        unique ID of the patient  (*url*)
    + pharmacyid (integer, required)

        unique ID of the pharmacy (*url*)

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
    + `invalid_pharmacy_id` (404) - a pharmacy with that ID was not found

    + Body

            {
                id: 1,
                name: "Pharmacy X",
                ...,
                success: true
            }

