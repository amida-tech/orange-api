Orange Backend API
=========

[![Build Status](https://travis-ci.org/amida-tech/orange-api.svg?branch=master)](https://travis-ci.org/amida-tech/orange-api)
[![Coverage Status](https://coveralls.io/repos/amida-tech/orange-api/badge.svg?branch=master)](https://coveralls.io/r/amida-tech/orange-api?branch=master)


**For detailed API documentation see [here](http://amida-tech.github.io/orange-api/)**

API for Orange medication management app. RESTful and implemented in Node & Mongo. Implements:
 - Setup user/patient
 - Save medications/doctors/pharmacies/user habits
 - Record dose events
 - View adherence schedule
 - Share information with other users (and outside email addresses who aren't yet users)

## Environment Variables (Grouped by Purpose)

Environment variables are applied in this order, with the former overwritten by the latter:

1. Default values, which are set automatically within `config.js`, even if no such environment variable is specified whatsoever.
2. Variables specified by the `.env` file. Note that, when using the Docker container of this repo, the Dockerfile copies `.env.docker` to `.env`, which makes those variables apply in this place.
3. Variables specified via the command line.

Variables are listed below in this format:

`VARIABLE_NAME` (Required, or not) [`the default value`] A description of what the variable is or does.
- Perhaps an example value, such as what to set it to in development
- Perhaps details on how to find out how to set the variable.
- Perhaps another example value, such as what to set it to in production.

### This Server

`X_CLIENT_SECRET` (Required) [None] All requests made to this API must have HTTP header `x-client-secret` with a value that matches this environment variable.

### This Service's MongoDB Instance

`MONGO_URI` MongoDB connection URI.
- `.env.docker` sets this to `mongodb://amida-orange-api-db/orange-api` which assumes:
  - `amida-orange-api-db` is the name of the docker container running MongoDB.
  - The docker container running MongoDB and this service's container are a part of the same docker network.

`MONGO_SSL` [`false`] Enable SSL for the connection to MongoDB.
- In production, set to true.

`MONGO_CERT_CA` Optional. Used if set and `MONGO_SSL` is `true`. Specifies an SSL cert to trust for the connection to MongoDB. If not set, only Mozilla's list of root certs are trusted.

### Integration With Amida Auth Microservice

`JWT_SECRET` (Required) [None] Must match value of the JWT secret being used by your `amida-auth-microservice` instance.
- See that repo for details.

`AUTH_MICROSERVICE_URL` (Required) [`http://localhost:4000/api/v1`] The URL of the Auth Service API.
- The URL of the staging Auth Service server is `https://orange-auth-staging.amida-services.com/api/v1`
- `.env.docker` sets this to `http://amida-auth-microservice:4000/api/v1`, which assumes:
  - `amida-auth-microservice` is the name of the docker container running the Auth Service.
  - `4000` is the port the Auth Service is running on in its container.
  - The Auth Service's docker container and this service's docker container are a part of the same docker network.

### Push Notifications

`PUSH_NOTIFICATION_ENABLED` [`false`] WARNING: When `true`, the other push notification-related environment variables must be set correctly. Not doing so is an unsupported state that is error-prone.

`NOTIFICATION_SERVICE_URL` [`http://localhost:4003/api`] The URL of the Notification Service API.
- The URL of the staging Notification Server is `https://orange-notification-staging.amida-services.com/api`
- `.env.docker` sets this to `http://amida-notification-microservice:4003/api`, which assumes:
  - `amida-notification-microservice` is the name of the docker container running the Notification Service.
  - `4003` is the port the Notification Service is running on in its container.
  - The Notification Service's docker container and this service's docker container are a part of the same docker network.

`PUSH_NOTIFICATION_MICROSERVICE_ACCESS_KEY` [`oucuYaiN6pha3ahphiiT`] The username of the service user that authenticates against `amida-auth-microservice` and performs requests against the `amida-notification-microservice` API.
- The default value is for development only. In production, set this to a different value.

`PUSH_NOTIFICATION_MICROSERVICE_PASSWORD` [`@TestTest1`] The password of the user specified by `PUSH_NOTIFICATION_MICROSERVICE_ACCESS_KEY`.
- The default value is for development only. In production, set this to a different value.

#### Integration With Apple iOS Push Notifications

Note: iOS push notifications do not and cannot work in development.

`PUSH_NOTIFICATION_SEND_APN` [`false`] Enable Apple Push Notifications.

`PUSH_NOTIFICATION_TEAMID` [`example_value_to_be_overwritten`] The ID of the Amida "team" in Apple Developer Console.
- Value stored in Amida's password vault.

`PUSH_NOTIFICATION_KEYID` [`example_value_to_be_overwritten`] Tells apple to use this key to encrypt the payload of push notifications that Apple sends to end-user devices.
- Value stored in Amida's password vault.

`PUSH_NOTIFICATION_APN_ENV` [`development`] Apple Push Notification environment.
- `.env.docker` sets this to `production`.

`PUSH_NOTIFICATION_TOPIC` [`com.amida.orangeIgnite`] The Apple Developer Console name of this app.

#### Integration With Google Android Push Notifications

Note: Unlike iOS push notifications, Android push notifications do work in development.

`PUSH_NOTIFICATION_FIREBASE_URL` [`https://fcm.googleapis.com/fcm/send`] Url of Google Android Firebase service.

`PUSH_NOTIFICATION_FIREBASE_SERVER_KEY` Identifies to Google that a server belonging to Amida is making this push notification request.
- Value stored in Amida's password vault.

## Quick up and running quide

### Prerequisites
- Node.js (v0.10+) and NPM
- Grunt.js
- MongoDB (v3.4 - higher versions will not work. If you need to downgrade instructions, [click here](https://stackoverflow.com/questions/30379127/how-to-install-earlier-version-of-mongodb-with-homebrew/47449979#47449979))
- Amida Auth Microservice(https://github.com/amida-tech/amida-auth-microservice)

### Initialization
- Initalize MongoDB
- `cp .env.example .env`
- Set up [Amida Auth Microservice](https://github.com/amida-tech/amida-auth-microservice)
  - see Auth Microservice README for details on setup
  - if you are developing locally, you may need to install and configure [Postgres](http://postgresapp.com/)
- Configure settings in `.env` in root directory (often `orange-api`)
  - Vital settings:
    - `X_CLIENT_SECRET` (any hexstring is suitable)
    - `JWT_SECRET` (must match Auth Microservice)
    - `AUTH_MICROSERVICE_URL` (must point to wherever your `amida-auth-microservice` server is running)
    - Web Address
    - Database Address
- Zeromq Address
- Defaults for these can be found in the `.env.example`

> Enabling notifications (not medication-taking app notifications, but rather SMS and/or email alerts on user registration) you'll also need to configure the notification settings (primarily Twilio and SendGrid API auth keys) in `config.js`

- Enabling Push Notifications with the Notifications Microservice
  - Set up and start the [Amida Notification Microservice](https://github.com/amida-tech/amida-notification-microservice)
  - Set the `config.notificationServiceAPI` in `config.js` to the url for the notification microservice
  - Next, use the `createAccessUser.js` script to create a `microservice user` on the Auth Service with username and password matching your `microserviceAccessKey` and `microservicePassword` values respectively in `config.js`. Ensure that the `microserviceAccessKey` value matches the `MICROSERVICE_ACCESS_KEY` `.env` value in the Notification Microservice. To create this admin user run the following command from the orange-api directory:
    - `node createAccessUser.js`
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

### Docker

Docker deployment requires two docker containers:
- An instance of the official MongoDB 3.4 docker image (see: https://hub.docker.com/_/mongo/).
- An instance of this service's docker image (see: https://hub.docker.com/r/amidatech/orange-api).

Also, the containers communicate via a docker network. Therefore,

1. First, create the Docker network:

```
docker network create {DOCKER_NETWORK_NAME}
```

2. Create the service user on the the Auth Service which will perform notification actions:

Before proceeding, the Auth Service must be running and the machine you are currently using must have Node.js installed.

Note: The `AUTH_MICROSERVICE_URL` below is relative to the machine running this command, not to any docker container.

```
npm run create-microservice-service-user -- {AUTH_MICROSERVICE_URL} {PUSH_NOTIFICATION_MICROSERVICE_ACCESS_KEY} {PUSH_NOTIFICATION_MICROSERVICE_PASSWORD}
```

3. Start the MongoDB container:

```
docker run -it --name amida-orange-api-db --network {DOCKER_NETWORK_NAME} mongo:3.4
```

4. Start the Orange API container:

```
docker run -d -p 5000:5000 --name amida-orange-api --network {DOCKER_NETWORK_NAME} \
-e X_CLIENT_SECRET={X_CLIENT_SECRET} \
-e JWT_SECRET={JWT_SECRET} \
-e MONGO_SSL=true \
-e MONGO_CERT_CA=$(cat ./path/to/trusted/cert) \
-e PUSH_NOTIFICATION_ENABLED=true \
-e PUSH_NOTIFICATION_KEYID={PUSH_NOTIFICATION_KEYID} \
-e PUSH_NOTIFICATION_TEAMID={PUSH_NOTIFICATION_TEAMID} \
-e PUSH_NOTIFICATION_FIREBASE_SERVER_KEY={PUSH_NOTIFICATION_FIREBASE_SERVER_KEY} \
-e PUSH_NOTIFICATION_MICROSERVICE_ACCESS_KEY={PUSH_NOTIFICATION_MICROSERVICE_ACCESS_KEY} \
-e PUSH_NOTIFICATION_MICROSERVICE_PASSWORD={PUSH_NOTIFICATION_MICROSERVICE_PASSWORD} \
-e NOTIFICATION_SENDGRID_API_KEY={NOTIFICATION_SENDGRID_API_KEY} \
amidatech/orange-api
```

### Vagrant

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
