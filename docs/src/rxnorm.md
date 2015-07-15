# Group RXNorm
Uses the RXNorm and OpenFDA APIs to look up medication details. An example flow would be to search
by name using the `/group` endpoint. If no results are found, then search for spelling suggestions
using the `/spelling` endpoint, and use the results to search by the correct name using the `/group`
endpoint.

## Medications by Name [/rxnorm/group]
### Query [POST]
Searches rxnorm for drug by name. Receives a response object with the name searched for and arrays
of information. Possible matches for drugs (if any) are located in the
`response.drugGroup.conceptGroup` array, with the bulk of the information in 
`response.drugGroup.conceptGroup[].conceptProperties`.

+ Parameters
    + medname (string, required)
        Medication name to search by.

+ Request
    + Body

            {
                medname: "Allegra-D"
            }

+ Response 200
    + `rxnorm_error` (500) - error communicating with Bloom API

    + Body

            {
                result: {
                    drugGroup: {
                        name: "Allegra-D",
                        conceptGroup: [
                            {
                                tty: "BPCK"
                            },
                            {
                                tty: "SBD",
                                conceptProperties: [
                                    {
                                        rxcui: "997512",
                                        name: "12 HR Fexofenadine hydrochloride 60 MG / Pseudoephedrine Hydrochloride 120 MG Extended Release Oral Tablet [Allegra-D]",
                                        synonym: "Allegra-D 12 Hour (fexofenadine hydrochloride 60 MG / pseudoephedrine hydrochloride 120 MG) Extended Release Oral Tablet",
                                        tty: "SBD",
                                        language: "ENG",
                                        suppress: "N",
                                        umlscui: "C0716180",
                                        dfg: ["Oral Tablet"],
                                        brand: "Allegra-D",
                                        modifiedname: "12 HR Fexofenadine hydrochloride 60 MG / Pseudoephedrine Hydrochloride 120 MG Extended Release  "
                                    }, {
                                        rxcui: "997515",
                                        name: "24 HR Fexofenadine hydrochloride 180 MG / Pseudoephedrine Hydrochloride 240 MG Extended Release Oral Tablet [Allegra-D]",
                                        synonym: "Allegra-D 24 Hour (fexofenadine hydrochloride 180 MG / pseudoephedrine hydrochloride 240 MG) Extended Release Oral Tablet",
                                        tty: "SBD",
                                        language: "ENG",
                                        suppress: "N",
                                        umlscui: "C1616745",
                                        dfg: ["Oral Tablet"],
                                        brand: "Allegra-D",
                                        modifiedname: "24 HR Fexofenadine hydrochloride 180 MG / Pseudoephedrine Hydrochloride 240 MG Extended Release  "
                                    }
                                ]
                            }
                        ]
                    },
                    compiled: [
                        {
                            rxcui: "997512",
                            name: "12 HR Fexofenadine hydrochloride 60 MG / Pseudoephedrine Hydrochloride 120 MG Extended Release Oral Tablet [Allegra-D]",
                            synonym: "Allegra-D 12 Hour (fexofenadine hydrochloride 60 MG / pseudoephedrine hydrochloride 120 MG) Extended Release Oral Tablet",
                            tty: "SBD",
                            language: "ENG",
                            suppress: "N",
                            umlscui: "C0716180",
                            dfg: ["Oral Tablet"],
                            brand: "Allegra-D",
                            modifiedname: "12 HR Fexofenadine hydrochloride 60 MG / Pseudoephedrine Hydrochloride 120 MG Extended Release  "
                        },
                        {
                            rxcui: "997515",
                            name: "24 HR Fexofenadine hydrochloride 180 MG / Pseudoephedrine Hydrochloride 240 MG Extended Release Oral Tablet [Allegra-D]",
                            synonym: "Allegra-D 24 Hour (fexofenadine hydrochloride 180 MG / pseudoephedrine hydrochloride 240 MG) Extended Release Oral Tablet",
                            tty: "SBD",
                            language: "ENG",
                            suppress: "N",
                            umlscui: "C1616745",
                            dfg: ["Oral Tablet"],
                            brand: "Allegra-D",
                            modifiedname: "24 HR Fexofenadine hydrochloride 180 MG / Pseudoephedrine Hydrochloride 240 MG Extended Release  "
                        }
                    ],
                    dfg: ["Oral Tablet"],
                    brand: ["Allegra-D"]
                },
                success: true
            }

## Medications by Spelling [/rxnorm/spelling]
### Query [POST]
Searches RXNorm for spelling suggestions for a given medication.

+ Parameters
    + medname (string, required)
        Medication name to search by.

+ Request
    + Body

            {
                medname: "allegrad"
            }

+ Response 200
    + `rxnorm_error` (500) - error communicating with Bloom API

    + Body

            {
                result: {
                    suggestionGroup: {
                        name: "allegrad",
                        suggestionList: {
                            suggestion: ["Allegra-D", "Allegra", "Allermax", "Alera", "Alkeran", "Aloeguard"]
                        }
                    }
                },
                success: true
            }
