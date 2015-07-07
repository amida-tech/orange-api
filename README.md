Orange Backend API
=========

[![Build Status](https://travis-ci.org/amida-tech/orange-api.svg?branch=master)](https://travis-ci.org/amida-tech/orange-api)
[![Coverage Status](https://coveralls.io/repos/amida-tech/orange-api/badge.svg?branch=master)](https://coveralls.io/r/amida-tech/orange-api?branch=master)


**For detailed API documentation see [here](http://amida-tech.github.io/orange-api/)**

API for Orange medication adherence apps. quasi-REST and implemented in Node & Mongo. Implements:
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

##Quick up and running quide
###Prerequisites

- Node.js (v0.10+) and NPM
- Grunt.js
- MongoDB
- ZeroMQ
- `zerorpc`, `python-dateutil`, `termcolor` and `pytz` python libraries (for schedule matching)

```
# you need Node.js and Grunt.js installed
# and MongoDB runnning

#install dependencies and build
npm install
grunt dev

```


## Contributing

Contributors are welcome. See issues https://github.com/amida-tech/orange-api/issues

## Release Notes

See release notes [here] (./RELEASENOTES.md)

## License

Licensed under [Apache 2.0](./LICENSE)
