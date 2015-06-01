# Group Dependents
Allows users to access the data of their dependents. In this context,
dependents are simply those users who've shared their data with the
current user (i.e., made the current user one of their caregivers).

## Dependents Collection [/users/dependents]
### List Dependents [GET]
Get a list of all the dependents who've shared data with the user.

+ Parameters
    + limit (integer, optional)

        Maximum number of results to return. Defaults to 25.

     + offset (integer, optional)

         Number of initial results to ignore (used in combination with `limit`)
         for pagination. Defaults to 0.

    + sort_by (string, optional)
    
        Field to sort results by. Must by either `id` or `email`, and defaults
        to `id`.

    + sort_order (string, optional)
    
        The order to sort results by: either `asc` or `desc`. Defaults to
        `asc`.

    + email (string, optional)

        Filter results by email address of dependent. Performs fuzzy matching.

+ Request
    + Headers

        Authorization: Bearer ACCESS_TOKEN

+ Response 200
    Errors
    + `access_token_required` (401) - no access token specified in
    `Authorization` header
    + `invalid_access_token` (401) - the access token specified is invalid
    + `invalid_limit` (400) - the specified result limit is invalid
    + `invalid_offset` (400) - the specified result offset is invalid
    + `invalid_sort_by` (400) - the specified sort field is invalid
    + `invalid_sort_order` (400) - the specified sort order is invalid

    Just like with caregivers, note that `id`s correspond to a dependent-caregiver
    relationship rather than the user ID of the dependent.

    + Body

        {
            dependents: [
                {
                    id: 1,
                    email: "depen@dent.com"
                },
                ...
            ],
            count: 2,
            success: true
        }

## Dependent [/user/dependents/{id}]
### View a Dependent [GET]
View information on a single dependent.

+ Parameters
    + id (integer, required)

        unique dependent ID of the dependent (note this is not the same as
        the user ID of the dependent)

+ Request
    + Headers

        Authorization: Bearer ACCESS_TOKEN

+ Response 200
    Errors
    + `access_token_required` (401) - no access token specified in
    `Authorization` header
    + `invalid_access_token` (401) - the access token specified is invalid
    + `invalid_dependent_id` (404) - a dependent with that ID was not found

    + Body

            {
                id: 1,
                email: "depen@dent.com",
                name: "Depen Dent",
                success: true
            }

## Habits [/users/dependents/{id}/habits]
### Get Habits [GET]
<!--- using <code> rather than ` here as we need <a> inside <code> for proper colouring -->
View the dependent's habits. See <code>[GET /users/habits](#habits-user-habits-get)</code>.

## Doctor Collection  [/users/dependents/{dependentid}/doctors]
### List Doctors [GET]
Get a list of the dependent's doctors. See <code>[GET /users/doctors](#doctors-doctors-collection-get)</code>.

## Doctor  [/users/dependents/{dependentid}/doctors/{doctorid}]
### View Doctor [GET]
Get a single one of the dependent's doctors. See <code>[GET /users/doctors/{doctorid}](#doctors-doctor-get)</code>.

## Pharmacy Collection  [/users/dependents/{dependentid}/pharmacies]
### List Pharmacies [GET]
Get a list of the dependent's pharmacies. See <code>[GET /users/pharmacies](#pharmacies-pharmacies-collection-get)</code>.

## Pharmacy [/users/dependents/{dependentid}/pharmacies/{pharmacyid}]
### View Pharmacy [GET]
Get a single one of the dependent's pharmacies. See <code>[GET /users/pharmacies/{pharmacyid}](#pharmacies-pharmacy-get)</code>.

## Medications Collection  [/users/dependents/{dependentid}/medications]
### List Medications [GET]
Get a list of the dependent's medications. See <code>[GET /users/medications](#medications-medications-collection-get)</code>.

## Medication [/users/dependents/{dependentid}/medications/{medicationid}]
### View Medication [GET]
Get a single one of the dependent's medications. See <code>[GET /users/medications/{medicationid}](#medications-medication-get)</code>.

## Medication Adherences [/users/dependents/{depid}/medications/{medid}/adherences]
### List Adherences [GET]
Get a list of all adherence events for a specific one of the dependent's medications.

See <code>[GET /users/medications/{medicationid}/adherences](#medications-medication-adherences-get)</code>.

## Adherence Collection [/user/dependents/{dependentid}/adherences]
### List Adherences [GET]
Get a list of all adherence events for all of the dependent's medications. See <code>[GET /users/adherences](#adherences-adherence-events-collection-get)</code>.

## Adherence Event [/user/dependents/{dependentid}/adherences/{adherenceid}]
### View Adherence [GET]
Get a single one of the dependent's adherence events. See <code>[GET /users/adherences/{adherenceid}](#adherences-adherence-event-get)</code>.

## Caregivers [/user/dependents/{dependentid}/caregivers]
### List Caregivers [GET]
Get a list of all other (including the current user) caregivers for the dependent. See <code>[GET /users/caregivers](#caregivers-caregivers-collection-get)</code>
