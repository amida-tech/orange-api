# Group NPI
Look up provider information in the National Plan and Provider Enumeration System (NPPES).

## Provider Collection [/npi/{npi}]
### Get NPI Data [GET]
Searches NPPES using then provided NPI. Returns the data associated with that NPI if it exists.

+ Parameters
    + npi (string, required)
        10 digit NPI number

+ Response 200
    + `npi_error` (500) - error communicating with NPPES API

    + Body

            {
                business_address: {
                    address_details_line: "2ND FLOOR",
                    address_line: "2350 W EL CAMINO REAL",
                    city: "MOUNTAIN VIEW",
                    country_code: "US",
                    state: "CA",
                    zip: "940406203"
                },
                credential: "MD",
                enumeration_date: "2006-08-31T00:00:00.000Z",
                first_name: "HARRY",
                gender: "male",
                last_name: "DENNIS",
                last_update_date: "2012-01-10T00:00:00.000Z",
                npi: 1073624029,
                practice_address: {
                    address_line: "795 EL CAMINO REAL",
                    city: "PALO ALTO",
                    country_code: "US",
                    phone: "6508532992",
                    state: "CA",
                    zip: "943012302"
                },
                provider_details: [{
                    healthcare_taxonomy_code: "208000000X",
                    license_number: "G68571",
                    license_number_state: "CA",
                    taxonomy_switch: "yes"
                }],
                sole_proprietor: "no",
                type: "individual"
            }

## Provider Collection [/npi]
### Query Providers [POST]
Searches NPPES API using a combination of first name, last name and State (two letter code). Receives an
array of possible Prescriber matches. NPPES limits the response to 100 possible matches.

+ Parameters
    + search (object, required)
        Query object to search by. See example below, as well as [here](https://github.com/amida-tech/npi-js) for documentation.

+ Request
    + Body

            {
                name: [{
                    first: "Harry", //String, Optional
                    last: "Dennis" //String, required
                }],
                address: [{
                    state: "CA" //String, optional
                }]
            }

+ Response 200
    + `npi_error` (500) - error communicating with NPPES API

    + Body

            {
                providers: [ 
                    {
                        business_address: {
                            address_details_line: "2ND FLOOR",
                            address_line: "2350 W EL CAMINO REAL",
                            city: "MOUNTAIN VIEW",
                            country_code: "US",
                            state: "CA",
                            zip: "940406203"
                        },
                        credential: "MD",
                        enumeration_date: "2006-08-31T00:00:00.000Z",
                        first_name: "HARRY",
                        gender: "male",
                        last_name: "DENNIS",
                        last_update_date: "2012-01-10T00:00:00.000Z",
                        npi: 1073624029,
                        practice_address: {
                            address_line: "795 EL CAMINO REAL",
                            city: "PALO ALTO",
                            country_code: "US",
                            phone: "6508532992",
                            state: "CA",
                            zip: "943012302"
                        },
                        provider_details: [{
                            healthcare_taxonomy_code: "208000000X",
                            license_number: "G68571",
                            license_number_state: "CA",
                            taxonomy_switch: "yes"
                        }],
                        sole_proprietor: "no",
                        type: "individual"
                    },
                    ...
                ],
                count: 3,
                success: true
            }

