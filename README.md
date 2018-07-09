SUD Core API
=========

## Description
API for SUD medication management app. RESTful and implemented in Node & Mongo. Implements:
 - Setup user/patient
 - Save medications/doctors/pharmacies/user habits
 - Record dose events
 - View adherence schedule
 - Share information with other users (and outside email addresses who aren't yet users)

This project supports:
 - Building the application through a build.sh script
 - Dockerizing/Containerizing the application with `Dockerfile` and `docker-compose.yml`.
 - Executing tasks through Grunt with `gruntfile.js`.
 - Executing tasks through Gulp with `gulpfile.js`.
 - Performing tests on the application.

## Technologies

 - node.js
 - ExpressJS
 - MongoDB

## Commands Available

- `npm install` - (From project root) This will install packages at the project level.
- `grunt test` - This will execute the tests on the application.
- `grunt dev` - This will run the api in development mode.

## Build

1. `./build.sh`

## Unit Tests

1. `grunt test`

## Notes for Package Maintainers

Note: Adding `%s` to your version update message will insert the version number.

### Patch 0.0.X

```
npm version patch -m "Patch upgrade to %s"
```

### Minor 0.X.0

```
npm version minor -m "Minor upgrade to %s"
```

### Major X.0.0

```
npm version major -m "Major upgrade to %s"
```

Don't forget to commit to git!

## References

- [Project Jira](https://issues.mobilehealth.va.gov/projects/SUD)
- [Project Wiki](https://wiki.mobilehealth.va.gov/display/SUD/Substance+Use+Disorder+Home)

## Quick up and running quide

### Prerequisites
- Node.js (v0.10+) and NPM
- Grunt.js
- MongoDB (v3.4 - higher versions will not work. If you need to downgrade instructions, [click here](https://stackoverflow.com/questions/30379127/how-to-install-earlier-version-of-mongodb-with-homebrew/47449979#47449979))
- Amida Auth Microservice(https://github.com/amida-tech/amida-auth-microservice)


### Initialization
- Initalize MongoDB
- `cp config.js.example config.js`
- Set up [Amida Auth Microservice](https://github.com/amida-tech/amida-auth-microservice)
  - see Auth Microservice README for details on setup
  - if you are developing locally, you may need to install and configure [Postgres](http://postgresapp.com/)
- Configure settings in `config.js` in root directory (often `orange-api`)
  - Vital settings:
    - `config.secret` (any hexstring is suitable)
    - `config.jwtSecret` (must match Auth Microservice)
    - `config.authServiceAPI` (must point to wherever your `amida-auth-microservice` server is running)
    - Web Address
    - Database Address
    - Zeromq Address
  - Defaults for these can be found in the `config.js.example`

> Enabling notifications (not medication-taking app notifications, but rather SMS and/or email alerts on user registration) you'll also need to configure the notification settings (primarily Twilio and SendGrid API auth keys) in `config.js`

- Enabling Push Notifications with the Notifications Microservice
  - Set up and start the [Amida Notification Microservice](https://github.com/amida-tech/amida-notification-microservice)
  - Set the `config.notificationServiceAPI` in `config.js` to the url for the notification microservice
  - If you haven't already, create a `microservice user` on the Auth Service with username and password matching your `microserviceAccessKey` and `microservicePassword` values respectively in `config.js`. Ensure that the `microserviceAccessKey` value matches the `MICROSERVICE_ACCESS_KEY` `.env` value in the Notification Microservice.
  - Set the `enablePushNotifications` option to true in your `config.js` file

- Enabling Push Notifications from within Orange
 -  This project is currently set up to send Push Notifications without an external API. While this might change in the future, it remains an option. Configuring and sending Push notifications from Orange is currently the way notifications for `Sharing Requests` are sent.

  - Set the `config.enableOrangePushNotifications` value to true in `config.js`. Note that you can only send Apple push notifications if your host is configured with SSL termination. Without this Apple may permanently invalidate the `key` you use to send the push notification. To enable sending Apple push notifications set the `config.sendAPN` value in `config.js` to true.
  - Obtain an Apple Developer Key and corresponding KeyId. You can download this file by logging into the team's apple developer console on `developer.apple.com`. Navigate to `Keys` on the left pane and create or download a key. Add this file to the root of the project and rename it to `iosKey.p8`. Add the corresponding keyId to `config.js`'s `config.keyId` value.
  - Set the `config.teamId` value in `config.js`. The is the ios developer teamID
  - If you are sending push notifications in development mode (not distribution or test flight), set the `config.apnENV` in `config.js` to "development" otherwise set it to "production".
  - Set the `config.pushTopic` value in `config.js` to the iOS AppId value. You can obtain this in the Apple developer console.

  - Set the `config.firebaseServerKey` value in `config.js`. This can be obtained from the Team's Firebase console. Note that the `Server key` is different from `API key`. The later is configured on a device for receiving notifications.

  - Note: if you are developing for the Amida team, most of the required keys and files can be found in the Amida OnePassword Account

- Install dependencies and build
  ```
  npm install
  grunt dev
  ```

### Running
`grunt dev`

## Deployment

For ease of deployment, see the instructions for deploying with Vagrant in [here](deploy/traditional/README.md).

## Load Testing

SSH Tunnel into the remote machine where `orange-api` has been deployed and from where you will be installing Locust and running your load tests. The following command will create an SSH tunnel into the specified address and begin forwarding your machine's local port `8089` (making a 'tunnel' with the remote machine's port `8089`) so that you can run the load tests on the server and still view the locust web interface from your local machine.

`ssh  -L 8089:localhost:8089 user@example.com`

### Installing Locust and other Python Dependencies

Once you have SSH'd into your remote machine, you will do the following on that machine to install the necessary libraries to run the load test script:

Create a new virtual enviroment using virtualenv with the command:

`virtualenv env`

I have called mine `env`.
(If you do not have virtualenv installed you can install it using `pip install virtualenv`)

activate your new enviroment with the command

`source env/bin/activate`

Once inside your new enviroment you will need to install locust, faker, and arrow using the following commands

`pip install locustio`

`pip install faker`

`pip install arrow`

### Launching load test using Locust

On the remote machine, navigate inside the directory that holds the orange-api repository and contains the file `locustfile.py`

Launch locust
`locust -f locustfile.py -H "http://localhost:5000/v1"`

### Viewing Locust web interface

Now, on your local machine:

Point your browser to http://127.0.0.1:8089/

From the Locust web interface you can change the settings and run the load-test

# Code Analysis
1. `$ gulp appAnalysis` to analyze code in `./lib`
2. `$ gulp testAnalysis` to analyze code in `./test`
3. Files are written to `./artifacts`


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
