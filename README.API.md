# API Documentation

quasi-REST API (Node + Mongo) for Orange medication adherence apps to:

 - Setup user/patient
   - Save meds/docs/pharmacies
	   - Manually (main method)
		 - Via Oauth2 and FHIR from e.g., DRE
	 - Get meds
	 - Likewise for user info and habits
 - Adherence
   - Save adherence datapoint 
	 - Get adherence data
 - Share
 	 - Share with other users
	   - Other users of app (main method)
		 - Via email/sms
	 - See data shared with me (via app)
	 
The rest of this `README` is filled with endpoints. Note that all endpoints *must* be prefixed with a version number (e.g., `POST /v1/auth/token`).

## Authentication
Access token model. The email/password are initially used to obtain a (nonexpiring) access token, which can then be sent as a header (see below) to authenticate all other API requests.

`Authorization: Bearer ACCESS_TOKEN`

The access token should not be base64 encoded (and contrary to popular belief, the same is true of OAuth2).

#### `POST /auth/token`
Obtains an access token (described above)

Request:

	{
		email: "foo@bar.com",
		password: "foobar"
	}
	
Response (200 on success, 403 on authentication error)

	{
		access_token: ACCESS_TOKEN,
		success: true,
		errors: ["error-key1", "error-key2"] # if unsuccessful
	}

## Setup Phase
On initial registration, but also whenever meds/doses/etc change.

### User Info
#### `POST /user`
Registers a user

Request:

	{
		email: "foo@bar.com",
		password: "foobar",
		name: "Foo Bar"
	}

Response (200 on success, 500 on error):

	{
		email: "foo@bar.com",
		name: "Foo Bar",
		success: true,
		errors: ["error-key1", "error-key2"] # if unsuccessful
	}		

#### `GET /user`
Returns basic metadata about the current user (email, name)

Request parameters: none

Headers: `Authorization`

Response (200 on success, 403 on authentication error)

	{
		email: "foo@bar.com",
		name: "Foo Bar",
		success: true,
		errors: ["error-key1", "error-key2"] # if unsuccessful
	}


#### `PUT /user`
Changes basic metadata (name, password) aobut the current user. Note that changing the password will force expire all access tokens.

Request (all keys optional):

	{
		password: "barfoo",
		name: "Foo Bar Baz"
	}


Headers: `Authorization`

Response (200 on success, 403 on authentication error):

	{
		email: "foo@bar.com",
		name: "Foo Bar Baz",
		success: true,
		errors: ["error-key1", "error-key2"] # if unsuccessful
	}

### Habits
#### `PUT /user/habits`
Request (all keys optional):

	{
		lunchTime: "1300",
		dinnerTime: "1900"
	}
	
Headers: `Authorization`

Response:

	{
		lunchTime: "1300",
		dinnerTime: "1900",
		success: true,
		errors: ["error-key1", "error-key2"] # if unsuccessful
	}

#### `GET /user/habits`
Request parameters: none

Headers: `Authorization`

Response:

	{
		lunchTime: "1300",
		dinnerTime: "1900",
		success: true,
		errors: ["error-key1", "error-key2"] # if unsuccessful
	}

### Doctors
####`POST /user/doctors`

Request:

	{
		name: "Dr. X",
		phone: "(617) 617-6177"
	}
	
Headers: `Authorization`

Response:

	{
		id: 1,
		name: "Dr. X",
		phone: "(617) 617-6177",
		success: true,
		errors: ["error-key1", "error-key2"] # if unsuccessful
	}

#### `GET /user/doctors`
Request parameters: `limit` (default 25), `offset` (default 0), `sort_by` (`id` or `name`; default `id`), `sort_order` (`asc` or `desc`; default `asc`), `name` (optional, fuzzy-matching)

Headers: `Authorization`

Response:

	{
		doctors: [
			{
				id: 1,
				name: "Dr. X",
				phone: "(617) 617-6177"
			},
			...
		],
		count: 5,
		success: true,
		errors: ["error-key1", "error-key2"] # if unsuccessful
	}
	
#### `GET /users/doctors/1`
Request parameters: none

Headers: `Authorization`

Response:

	{
		id: 1,
		name: "Dr. X",
		phone: "(617) 617-6177",
		success: true,
		errors: ["error-key1", "error-key2"] # if unsuccessful
	}

#### `PUT /user/doctors/1`
Request (all keys optional):

	{
		name: "Dr. Y",
		phone: "(716) 716-7166"
	}
	
Headers: `Authorization`

Response:

	{
		id: 1,
		name: "Dr. Y",
		phone: "(716) 716-7166",
		success: true,
		errors: ["error-key1", "error-key2"] # if unsuccessful
	}


#### `DELETE /user/doctors/1`
Request: `{}`

Headers: `Authorization`

Response:

	{
		id: 1,
		name: "Dr. X",
		phone: "(617) 617-6177",
		success: true,
		errors: ["error-key1", "error-key2"] # if unsuccessful
	}

### Pharmacies
Names, addresses, phone numbers, hours open

#### `POST /user/pharmacies`
Request:

	{
		name: "Pharmacy X",
		address: "Pharmacy Street, DC, 2052"
		phone: "(617) 617-6177",
		hours: {
			monday: {
				open: "0900",
				close: "1700"
			},
			tuesday: {..},
			wednesday: {..},
			thursday: {..},
			friday: {..},
			saturday: {..},
			sunday: {..}
		}
	}
	
Headers: `Authorization`

Response:

	{
		id: 1,
		name: "Pharmacy X",
		...
		hours: {...},
		success: true,
		errors: ["error-key1", "error-key2"] # if unsuccessful
	}

#### `GET /user/pharmacies`
Request parameters: `limit` (default 25), `offset` (default 0), `sort_by` (`id` or `name`; default `id`), `sort_order` (`asc` or `desc`; default `asc`), `name` (optional, fuzzy-matching)


Headers: `Authorization`

Response:

	{
		pharmacies: [
			{
				{
					id: 1,
					name: "Pharmacy X",
					...
					hours: {...}
				}
			},
			...
		]
		count: 6,
		success: true,
		errors: ["error-key1", "error-key2"] # if unsuccessful
	}
	
#### `GET /user/pharmacies/1`
Request parameters: none

Headers: `Authorization`

Response: 

	{
		id: 1,
		name: "Pharmacy X",
		...
		hours: {...},
		success: true,
		errors: ["error-key1", "error-key2"] # if unsuccessful
	}
 
#### `PUT /user/pharmacies/1`
Request (all *top-level* keys optional):

	{
		name: "Pharmacy Y",
		address: "Pharmacy Road, DC, 2052"
		phone: "(618) 617-6177",
		hours: {
			monday: {
				open: "0800",
				close: "1700"
			},
			tuesday: {..},
			wednesday: {..},
			thursday: {..},
			friday: {..},
			saturday: {..},
			sunday: {..}
		}
	}
	
Headers: `Authorization`

Response:

	{
		id: 1,
		name: "Pharmacy Y",
		address: "Pharmacy Road, DC, 2052"
		phone: "(618) 617-6177",
		hours: {
			monday: {
				open: "0800",
				close: "1700"
			},
			tuesday: {..},
			wednesday: {..},
			thursday: {..},
			friday: {..},
			saturday: {..},
			sunday: {..}
		},
		success: true,
		errors: ["error-key1", "error-key2"] # if unsuccessful
	}

#### `DELETE /user/pharmacies/1`
Request: `{}`

Headers: `Authorization`

Response:

	{
		id: 1,
		name: "Pharmacy X",
		...
		hours: {...},
		success: true,
		errors: ["error-key1", "error-key2"] # if unsuccessful
	}

### Medications
#### `POST /user/medications`
Request:

	{
		name: "Loratadine",
		dose: "100mg",
		route: "oral",
		form: "pill",
		rxNumber: "123456789",
		quantity: 50
		type: "OTC",
		schedule: {
			# TODO
		},
		doctor_id: 1,
		pharmacy_id: 1
	}

Headers: `Authorization`

Response:

	{
		id: 1,
		name: "Loratadine",
		dose: "100mg",
		route: "oral",
		form: "pill",
		rxNumber: "123456789",
		quantity: 50
		type: "OTC",
		schedule: {
			# TODO
		},
		doctor_id: 1,
		pharmacy_id: 1
		success: true,
		errors: ["error-key1", "error-key2"] # if unsuccessful
	}


#### `GET /user/medications`
Request parameters: `limit` (default 25), `offset` (default 0), `sort_by` (`id`, `name`, `dose`, `quantity`; default `id`), `sort_order` (`asc` or `desc`; default `asc`), `name` (optional, fuzzy-matching), `route` (optional), `form` (optional), `type` (optional)

Headers: `Authorization`

Response:

	{
		medications: [
			{
				id: 1,
				name: "Loratadine",
				...,
				schedule: {...},
				pharmacy: {
					# populated with info of pharmacy
				},
				doctor: {
					# populated with info of doctor
				}
			},
			...
		],
		count: 6,
		success: true,
		errors: ["error-key1", "error-key2"] # if unsuccessful
	}

#### `GET /user/medications/1`
Request parameters: none

Headers: `Authorization`

Response:

	{
		id: 1,
		name: "Loratadine",
		...,
		schedule: {...},
		pharmacy: {
			# populated with info of pharmacy
		},
		doctor: {
			# populated with info of doctor
		},
		success: true,
		errors: ["error-key1", "error-key2"] # if unsuccessful
	}

#### `GET /user/medications/1/adherences`
Request parameters: `limit` (default 25), `offset` (default 0), `sort_by` (`id` or `date`; default `date`), `sort_order` (`asc` or `desc`; default `desc`)


Headers: `Authorization`

	{
		adherences: [
			{
				id: 1,
				medication_id: 1,
				date: 2015-05-27T18:25:43.511Z,
				notes: "Noticed effect immediately!"
			},
			...
		],
		count: 46,
		success: true,
		errors: ["error-key1", "error-key2"] # if unsuccessful
	}


#### `PUT /user/medications/1`
Request (all *top-level* keys optional):

	{
		name: "Fexofenadine",
		dose: "150mg",
		route: "nasal",
		form: "spray",
		rxNumber: "1987654321"",
		quantity: 12
		type: "prescription",
		schedule: {
			# TODO
		},
		doctor_id: 2,
		pharmacy_id: 3
	}

Headers: `Authorization`

Response:

	{
		id: 1,
		name: "Fexofenadine",
		dose: "150mg",
		route: "nasal",
		form: "spray",
		rxNumber: "1987654321"",
		quantity: 12
		type: "prescription",
		schedule: {
			# TODO
		},
		doctor_id: 2,
		pharmacy_id: 3,
		success: true,
		errors: ["error-key1", "error-key2"] # if unsuccessful
	}

#### `DELETE /user/medications/1`
Request: `{}`

Headers: `Authorization`

Response:

	{
		id: 1,
		name: "Fexofenadine",
		...
		pharmacy_id: 3,
		success: true,
		errors: ["error-key1", "error-key2"] # if unsuccessful
	}

## Adherence
On a daily basis.

#### `POST /user/adherences`
Request:

	{
		medication_id: 1,
		date: 2015-05-27T18:25:43.511Z,
		notes: "Noticed effect immediately!"
	}
	
Headers: `Authorization`

Response:

	{
		id: 1,
		medication_id: 1,
		date: 2015-05-27T18:25:43.511Z,
		notes: "Noticed effect immediately!",
		success: true,
		errors: ["error-key1", "error-key2"] # if unsuccessful
	}
	
#### `GET /user/adherences`
Request parameters: `limit` (default 25), `offset` (default 0), `sort_by` (`id` or `date`; default `date`), `sort_order` (`asc` or `desc`; default `desc`)

Headers: `Authorization`

Response:

	{
		adherences: [
			{
				id: 1,
				medication_id: 1,
				date: 2015-05-27T18:25:43.511Z,
				notes: "Noticed effect immediately!"
			},
			...
		],
		count: 170,
		success: true,
		errors: ["error-key1", "error-key2"] # if unsuccessful
	}

#### `GET /user/adherences/1`
Request parameters: none

Headers: `Authorization`

Response:

	{
		id: 1,
		medication: {
			# Medication expanded
			# Includes expanded pharmacy & doctor
		},
		date: 2015-05-27T18:25:43.511Z,
		notes: "Noticed effect immediately!"
		success: true,
		errors: ["error-key1", "error-key2"] # if unsuccessful
	}
	
#### `PUT /user/adherences/1`
Request (all keys optional):

	{
		medication_id: 2,
		date: 2015-05-28T18:25:43.511Z,
		notes: "Didn't feel anything"
	}
	
Headers: `Authorization`

Response:

	{
		id: 1,
		medication_id: 2,
		date: 2015-05-28T18:25:43.511Z,
		notes: "Didn't feel anything"
		success: true,
		errors: ["error-key1", "error-key2"] # if unsuccessful
	}

#### `DELETE /user/adherences/1`
Request: `{}`

Headers: `Authorization`

Response:

	{
		id: 1,
		medication_id: 2,
		date: 2015-05-28T18:25:43.511Z,
		notes: "Didn't feel anything"
		success: true,
		errors: ["error-key1", "error-key2"] # if unsuccessful
	}


## Sharing
### Share with Others
#### `GET /shared_to`
Request parameters: `limit` (default 25), `offset` (default 0), `sort_by` (`id` or `email`; default `id`), `sort_order` (`asc` or `desc`; default `asc`)


Headers: `Authorization`

Response:

	{
		sharedTo: [
			{
				id: 5, # unique to the user viewing *and* the user sharing
				email: "foo@bar.com"
			},
			{
				id: 99,
				email: "baz@qux.com"
			},
			...
		]
		count: 17,
		success: true,
		errors: ["error-key1", "error-key2"] # if unsuccessful
	}

#### `POST /shared_to`
Request:

	{
		email: "foo@bar.com"
	}
	
Headers: `Authorization`

Response:

	{
		id: 5,
		email: "foo@bar.com"
		success: true,
		errors: ["error-key1", "error-key2"] # if unsuccessful
	}

#### `DELETE /shared_to/1`
Request: `{}`

Headers: `Authorization`

Response:

	{
		id: 5,
		email: "foo@bar.com"
		success: true,
		errors: ["error-key1", "error-key2"] # if unsuccessful
	}

### Data Shared with Me
#### `GET /shared`
Request parameters: `limit` (default 25), `offset` (default 0), `sort_by` (`id` or `email`; default `id`), `sort_order` (`asc` or `desc`; default `asc`)

Headers: `Authorization`

Response:

	{
		shared: [
			{
				id: 5, # unique to the user viewing *and* the user sharing
				email: "foo@bar.com"
			},
			{
				id: 99,
				email: "baz@qux.com"
			},
			...
		]
		count: 17,
		success: true,
		errors: ["error-key1", "error-key2"] # if unsuccessful
	}
	
#### `GET /shared/1`
Request parameters: none

Headers: `Authorization`

Response:

	{
		id: 1, # unique to the user viewing *and* the user sharing
		email: "foo@bar.com",
		name: "Foo Bar",
		success: true,
		errors: ["error-key1", "error-key2"] # if unsuccessful
	}

#### `GET /shared/1/habits`
See `GET /user/habits`.

#### `GET /shared/1/doctors`
See `GET /user/doctors`.

#### `GET /shared/1/pharmacies`
See `GET /user/pharmacies`.

#### `GET /shared/1/medications`
See `GET /user/medications`.

#### `GET /shared/1/adherences`
See `GET /user/adherences`.

#### `GET /shared/1/adherences/1`
See `GET /user/adherences/1`. 

## Error Slugs
 - `email_required`
 - `password_required`
 - `name_required`
 - `unknown_error`
 - `invalid_email_password`
 - `user_already_exists`
 - `access_token_required`
 - `invalid_access_token`

TODO list the rest of these once established
