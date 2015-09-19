Orange Backend API
=========

[![Build Status](https://travis-ci.org/amida-tech/orange-api.svg?branch=master)](https://travis-ci.org/amida-tech/orange-api)
[![Coverage Status](https://coveralls.io/repos/amida-tech/orange-api/badge.svg?branch=master)](https://coveralls.io/r/amida-tech/orange-api?branch=master)


**For detailed API documentation see [here](http://amida-tech.github.io/orange-api/)**

API for Orange medication adherence apps. RESTful and implemented in Node & Mongo. Implements:
 - Setup user/patient
 - Save medications/doctors/pharmacies/user habits
 - Record dose events
 - View adherence schedule
 - Share information with other users (and outside email addresses who aren't yet users)

##Quick up and running quide
###Prerequisites

- Node.js (v0.10+) and NPM
- Grunt.js
- MongoDB

```
# you need Node.js and Grunt.js installed
# and MongoDB running

# you'll also need to configure the various settings documented in config.js
# in the root app directory (often `orange-api`).
# The only vital ones are the client secret (any hexstring is suitable) and the
# addresses for web/db/zeromq. Sensible defaults can be used for those and all
# other settings by copying `config.js.example` to `config.js`

# if you want to enable notifications (not medication-taking app notifications,
# but rather e.g., SMS and/or email alerts on user registration) you'll
# also need to configure the notification settings (primarily Twilio and
# SendGrid API auth keys) in `config.js`

#install dependencies and build
npm install
grunt dev

```

For ease of deployment, see the instructions for deploying with Vagrant in `deploy/`.

## Contributing

Contributors are welcome. See issues https://github.com/amida-tech/orange-api/issues

## Release Notes

See release notes [here] (./RELEASENOTES.md)

## Technical Documentation
The API is structured as a standard Express app using Mongoose for data storage. The Controller-Model pattern is followed, with everything output over
JSON so seperate views not as necessary (although semantically each model instance has a getData method that acts as the view). App setup and initialisation
is in `app.js` and database connection/etc is in `run.js`. `config.js` contains configuration for API keys (sendgrid and twilio for notifications), logging
and database hosts.

Tests are in `test/`, structured as directories for each resource group containing e2e tests, and sometimes `unit/` directories inside those containing
`unit` tests. Grunt (`gruntfile.js`) is used to run tests (`grunt` or `grunt test`) and can also be used to spin up a development server (`grunt server:dev`), although `node run.js` is much quicker to start up and will work for all endpoints apart from those that rely on schedule matching
(`/patients/:id/schedule`, `/patients/:id.json` and `/patients/:id.pdf`).

Controllers are in in `lib/controllers` and models in `lib/models`. Most are standard CRUD controllers, with various CRUD helper functions used (mainly as
middleware) to DRY things up. See `lib/controllers/helpers/crud.js` mainly (e.g., `formatObject` and `formatList` are used in nearly all endpoints).

Models are pretty standard mongoose models. `counter.js` and `helpers/increment_plugin.js` are used to provide auto-incrementing numerical IDs. All models
that correspond to patient resources (`Doctor`, `Dose`, `JournalEntry`, `Medication` and `Pharmacy`) are stored as subdocuments or subarrays within
`Patient`, and because of this and some mongoose intracies some of their logic is in `lib/models/patient/resources.js` rather than e.g.,
`lib/models/doctor.js`.

Schedule matching is slightly more complex. Each medication stores a schedule object, freshly-parsed into a `Schedule` (`lib/models/schedule/`) object
upon instance initialisation. This represents the schedule when the medication *should* be taken in an abstract form. `schedule/generation.js` uses this 
to generate a concrete schedule for when the medication *should* be taken, given a start and end date. Various endpoints then need to match this up
with the doses the user has actually recorded (either taken or not taken), represented as `Dose` objects in `patient.doses`. Depending on the level of
information we have about each dose, this is slightly nontrivial problem, solved with an algorithm documented in `lib/models/helpers/schedule_matcher.js`.

Patient images ('avatars') are stored in gridfs rather than as files or raw in mongo, and the relevant code is in `lib/models/patient/avatar.js` (slightly
more complicated than standard because it parses MIME types from the actual image data whilst storing images).

All errors that should be visible to the API user are passed up the stack then handled by `error_handler.js` and `errors.js`. Each API error has an
instance of the custom `APIError` classs initialised in `errors.js` which can then be used anywhere else in the app. `error_handler.js` handles both these
and mongoose errors (a couple heuristics are used to look up `APIError` instances based on field name, etc). These errors are then returned by setting
the HTTP response code appropriately and returning `{ success: false, errors: [...] }` as a response body.

The external RXNorm and NPI APIs are proxied for various queries (`lib/controllers/rxnorm.js` and `lib/controllers/npi.js`). The RXNorm spelling suggestions
endpoint is hit very heavily and RXNorm rate-limit us to 20 queries per second so that's cached (mongo because the mongo infrastructure was already set up
and the advantages of redis/memcached/etc are irrelevant here) in `lib/models/rxnorm.js`, although the actual queries for both APIs are just delegated to the
`rxnorm-js` and `npi-js` NPM libraries (both Amida written).

The `/patients/:id.pdf` endpoint generates and returns a report PDF. This is done dynamically on-the-fly but is fast enough this shouldn't be an issue (and
could of course easily be cached if so). The relevant code is in `lib/controllers/patients/report.js` (although much of that that should probably be
abstracted out to a `lib/views` directory at some point) and uses the `pdfmake` library  for the actual PDF generation. The `fonts/` and `images/`
directories are used to provide assets in that generation process. `grunt report` can be used to generate a sample PDF for test data, and regenerate it
whenever the relevant code changes so is useful for development here. 

Notifications are sent out upon various actions (user registration, sharing request received/cancelled/closed/accepted) and notifications for new actions
can easily be added (`user.notify`). The relevant code is in `lib/models/user/notifications.js`. Handlebars templates for the notifications sent are taken
from the `views/` directory. Notifications can be sent to either SMS (Twilio) or email (Sendgrid) (dependent on both the data available for a user and
individual notification settings). API keys for Twilio and Sendgrid are configured in `config.js` and are left blank on the staging server so notifications
are not sent out during testing.

The `static/` directory contains webpages that are statically accessible on the staging server (with the `.html` suffix removed so `login.html` becomes
`http://STAGING-SERVER-ADDRESS/login`). `login` uses the custom URI scheme in the mobile app to launch the app to the login page if it's installed, or
take you to the relevant app store if on mobile and the app's not installed, or just displays a static page on desktop (this page is linked to by the
email notification received when resetting password).

All API endpoints are fully documented using API Blueprint in `docs/src`, and `docs/build.sh` (`grunt docs`) is used to build this into HTML documentation
at `docs/output/` with the `aglio` library. Some slightly hackish deviations from the API Blueprint spec to get the desired output from Aglio are made,
although these are very apparent and self-explanatory in `docs/src`. As well as on the staging server, docs are published on github and the newest docs
can be generated from source and pushed to the `gh-pages` branch with `grunt docs:push`.

Deployment things are in `deploy/` and are documented in `deploy/README.md`. We currently recommend using the traditional/Ansible deployment option
which is documented in detail in `deploy/traditional/README.md`.

## License

Licensed under [Apache 2.0](./LICENSE)
