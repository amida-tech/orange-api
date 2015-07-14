Orange Backend API
=========

[![Build Status](https://travis-ci.org/amida-tech/orange-api.svg?branch=master)](https://travis-ci.org/amida-tech/orange-api)
[![Coverage Status](https://coveralls.io/repos/amida-tech/orange-api/badge.svg?branch=master)](https://coveralls.io/r/amida-tech/orange-api?branch=master)


**For detailed API documentation see [here](http://amida-tech.github.io/orange-api/)**

API for Orange medication adherence apps. quasi-REST and implemented in Node & Mongo. Implements:
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
- ZeroMQ
- `zerorpc`, `python-dateutil`, `termcolor`, `pyevolve` and `pytz` python libraries (for schedule matching) (`pip install -r lib/matching/requirements.txt`)

```
# you need Node.js and Grunt.js installed
# and MongoDB running

# you also need a client secret (any hexstring) which should be
# placed into .secret in the root app directory (often `orange-api`)

#install dependencies and build
npm install
grunt dev

```

For ease of deployment, see the instructions for deploying with Vagrant in `deploy/`.

## Contributing

Contributors are welcome. See issues https://github.com/amida-tech/orange-api/issues

## Release Notes

See release notes [here] (./RELEASENOTES.md)

## License

Licensed under [Apache 2.0](./LICENSE)
