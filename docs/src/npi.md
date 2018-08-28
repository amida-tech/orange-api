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
                "taxonomies": [
                    {
                        "state": "CA",
                        "code": "208000000X",
                        "primary": true,
                        "license": "G68571",
                        "desc": "Pediatrics"
                    }
                ],
                "addresses": [
                    {
                        "city": "PALO ALTO",
                        "address_2": "",
                        "telephone_number": "650-853-2992",
                        "state": "CA",
                        "postal_code": "943012302",
                        "address_1": "795 EL CAMINO REAL",
                        "country_code": "US",
                        "country_name": "United States",
                        "address_type": "DOM",
                        "address_purpose": "LOCATION"
                    },
                    {
                        "city": "MOUNTAIN VIEW",
                        "address_2": "2ND FLOOR",
                        "state": "CA",
                        "postal_code": "940406203",
                        "address_1": "2350 W EL CAMINO REAL",
                        "country_code": "US",
                        "country_name": "United States",
                        "address_type": "DOM",
                        "address_purpose": "MAILING"
                    }
                ],
                "created_epoch": 1156982400,
                "identifiers": [],
                "other_names": [],
                "number": 1073624029,
                "last_updated_epoch": 1326153600,
                "basic": {
                    "status": "A",
                    "credential": "MD",
                    "first_name": "HARRY",
                    "last_name": "DENNIS",
                    "last_updated": "2012-01-10",
                    "name": "DENNIS HARRY",
                    "gender": "M",
                    "sole_proprietor": "NO",
                    "enumeration_date": "2006-08-31"
                },
                "enumeration_type": "NPI-1"
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
                        "taxonomies": [
                            {
                                "state": "CA",
                                "code": "208000000X",
                                "primary": true,
                                "license": "G68571",
                                "desc": "Pediatrics"
                            }
                        ],
                        "addresses": [
                            {
                                "city": "PALO ALTO",
                                "address_2": "",
                                "telephone_number": "650-853-2992",
                                "state": "CA",
                                "postal_code": "943012302",
                                "address_1": "795 EL CAMINO REAL",
                                "country_code": "US",
                                "country_name": "United States",
                                "address_type": "DOM",
                                "address_purpose": "LOCATION"
                            },
                            {
                                "city": "MOUNTAIN VIEW",
                                "address_2": "2ND FLOOR",
                                "state": "CA",
                                "postal_code": "940406203",
                                "address_1": "2350 W EL CAMINO REAL",
                                "country_code": "US",
                                "country_name": "United States",
                                "address_type": "DOM",
                                "address_purpose": "MAILING"
                            }
                        ],
                        "created_epoch": 1156982400,
                        "identifiers": [],
                        "other_names": [],
                        "number": 1073624029,
                        "last_updated_epoch": 1326153600,
                        "basic": {
                            "status": "A",
                            "credential": "MD",
                            "first_name": "HARRY",
                            "last_name": "DENNIS",
                            "last_updated": "2012-01-10",
                            "name": "DENNIS HARRY",
                            "gender": "M",
                            "sole_proprietor": "NO",
                            "enumeration_date": "2006-08-31"
                        },
                        "enumeration_type": "NPI-1"
                    },
                    ...
                ],
                count: 3,
                success: true
            }

