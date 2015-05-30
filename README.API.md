**Documentation is being transferred to [here](src/api.mid)**

### Doctors
####`POST /user/doctors`

Request:

	{
		name: "Dr. X",
		phone: "(617) 617-6177",
		address: "Doctor Street, DC, 2052"
	}
	
Headers: `Authorization`

Response:

	{
		id: 1,
		name: "Dr. X",
		phone: "(617) 617-6177",
		address: "Doctor Street, DC, 2052"
		success: true
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
				phone: "(617) 617-6177",
                address: "Doctor Street, DC, 2052"
			},
			...
		],
		count: 5,
		success: true
	}
	
#### `GET /users/doctors/1`
Request parameters: none

Headers: `Authorization`

Response:

	{
		id: 1,
		name: "Dr. X",
		phone: "(617) 617-6177",
        address: "Doctor Street, DC, 2052",
		success: true
	}

#### `PUT /user/doctors/1`
Request (all keys optional):

	{
		name: "Dr. Y",
		phone: "(716) 716-7166",
        address: "Doctor Street, DC, 2052"
	}
	
Headers: `Authorization`

Response:

	{
		id: 1,
		name: "Dr. Y",
		phone: "(716) 716-7166",
        address: "Doctor Street, DC, 2052",
		success: true
	}


#### `DELETE /user/doctors/1`
Request: `{}`

Headers: `Authorization`

Response:

	{
		id: 1,
		name: "Dr. X",
		phone: "(617) 617-6177",
        address: "Doctor Street, DC, 2052",
		success: true
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
		success: true
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
		success: true
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
		success: true
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
		success: true
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
		success: true
	}

### Medications
#### `POST /user/medications`
Request:

	{
		name: "Loratadine",
        rxNorm: "324026",
        ndc: "33261-0228",
		dose: {
            quantity: 100,
            unit: "mg"
        },
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
        rxNorm: "324026",
        ndc: "33261-0228",
		dose: {
            quantity: 100,
            unit: "mg"
        },
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
		success: true
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
		success: true
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
		success: true
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
		success: true
	}


#### `PUT /user/medications/1`
Request (all *top-level* keys optional):

	{
		name: "Fexofenadine",
        rxNorm: "324026",
        ndc: "33261-0228",
		dose: {
            quantity: 150,
            unit: "mg"
        },
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
        rxNorm: "324026",
        ndc: "33261-0228",
		dose: {
            quantity: 100,
            unit: "mg"
        },
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
		success: true
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
		success: true
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
		success: true
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
		success: true
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
		success: true
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
		success: true
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
		success: true
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
		success: true
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
		success: true
	}

#### `DELETE /shared_to/1`
Request: `{}`

Headers: `Authorization`

Response:

	{
		id: 5,
		email: "foo@bar.com"
		success: true
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
		success: true
	}
	
#### `GET /shared/1`
Request parameters: none

Headers: `Authorization`

Response:

	{
		id: 1, # unique to the user viewing *and* the user sharing
		email: "foo@bar.com",
		name: "Foo Bar",
		success: true
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
