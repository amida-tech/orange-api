const util = require('util');

const axios = require('axios');
const jwt = require('jsonwebtoken');
const Client = require('node-rest-client').Client;

const { createMoodEntries, createMeditationEntries, createMedicationAdherence } =  require('./createRecordsScript');
const logger = require ('./winston.js');

//URL's
const authUrl = `${process.argv[2]}/auth/login`;  //"http://localhost:4000/api/v1/auth/login"
const patientsUrl = `${process.argv[3]}/patients`;   //"http://localhost:5000/v1/patients"
const clientSecret = process.argv[4];

// Email and password of the patient
const email = process.argv[5].replace(/^"(.*)"$/, '$1'); 
const password = process.argv[6].replace(/^"(.*)"$/, '$1');

// TODO: JCB once this script creates medications we will need to do the same regex replace on these values
// Email and password of the clinician
const email2 = process.argv[7];
const password2 = process.argv[8]; 

// Init value determines if we are creating medications for each user or not
const init = (process.argv[9] ? process.argv[9]: false);

var authToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6NywidXNlcm5hbWUiOiJSdWJ5ZUBhbWlkYS5jb20iLCJlbWFpbCI6IlJ1YnllQGFtaWRhLmNvbSIsInNjb3BlcyI6WyIiXSwiaWF0IjoxNTIwMjY5OTA5LCJleHAiOjE1MjAyNzY1MDl9.lBsjsQtHxuI8E5C7VHaxkulZZugkbk0FFYl_rT580Bo';
const client = new Client();


async function authenticate (username, password) {
  try {
    const res = await axios.post(authUrl, {
        username,
        password
    });
    logger.debug(`Authentication successful for user ${username}. Response body is:`, res.data);
    return res.data;
  } catch (e) {
    logger.info(`Authentication failed for user ${username}. Exiting process with status 1.`);
    logger.debug(util.inspect(e));
    process.exit(1);
  }
}

async function getPatients (token) {
  let username;
  try {
    username = jwt.decode(token).username;
    const response = await axios({
      method: 'get',
      url: patientsUrl,
      headers: {
        'Content-Type': 'application/json',
        'X-Client-Secret': clientSecret,
        'Authorization': `Bearer ${token}`
      }
    });
    logger.debug(`Fetching patients successful for user ${username}. Response body is:`, response.data);
    return response.data;
  } catch (e) {
    logger.info(`Fetching patient failed for user ${username}`);
    logger.debug(util.inspect(e));
    process.exit(1);
  }
}

const createMedication = function(medArgs, patientId, callback) {
  client.post(`${patientsUrl}/${patientId}/medications`, medArgs, function (data, response) {
    callback(data, response);
  });
};

async function getMedications (token, patientId) {
  let username;
  try {
    username = jwt.decode(token).username;
    const response = await axios({
      method: 'get',
      url: `${patientsUrl}/${patientId}/medications`,
      headers: {
        'Content-Type': 'application/json',
        'X-Client-Secret': clientSecret,
        'Authorization': `Bearer ${token}`
      }
    });
    logger.debug(`Fetching medications successful for user ${username}. Response body is:`, response.data);
    return response.data;
  } catch (e) {
    logger.info(`Fetching medications failed for user ${username}`);
    logger.debug(util.inspect(e));
    process.exit(1);
  }
}

const authArgsPatient = {
  headers : {"Content-Type": "application/json", "X-Client-Secret" : clientSecret},
  data: {
    "username": email,
    "password": password
  }
};


async function produceData () {
  //data for a new user to be included in the message thread

  var authToken2 = '';

  const authArgsClinician = {
    headers : {"Content-Type": "application/json", "X-Client-Secret" : clientSecret},
    data: {
      "username": email2,
      "password": password2
    }
  };

  const ibuMedArgs = {
    headers: { "Content-Type": "application/json", "X-Client-Secret" : clientSecret, "Authorization":"Bearer "+authToken2},
    data: {
      name: "IBUPROFEN",
      form: "TAB",
      access_anyone: 'write',
      dose: {
          quantity: 1,
          unit: "dose"
      },
      schedule: {
          as_needed: true,
          frequency: {n: 1, unit: "day"},
          regularly: true,
          take_with_food: null,
          take_with_medications: [],
          take_without_medications: [],
          times: [{type: "exact", time: "09:00"}],
          until: {type: "forever"}
      }
    }
  }

  const aspirinMedArgs = {
    headers: { "Content-Type": "application/json", "X-Client-Secret" : clientSecret, "Authorization":"Bearer "+authToken2},
    data: {
      name: "ASPIRIN",
      form: "TAB",
      access_anyone: 'write',
      dose: {
          quantity: 1,
          unit: "dose"
      },
      schedule: {
          as_needed: true,
          frequency: {n: 1, unit: "day"},
          regularly: true,
          take_with_food: null,
          take_with_medications: [],
          take_without_medications: [],
          times: [{type: "exact", time: "10:30"}],
          until: {type: "forever"}
      }
    }
  }

  try {
    const authResponseBody = await authenticate(email, password);
    const authToken = authResponseBody.token

    // Get first user's patient and share it with the new user
    const response = await getPatients(authToken);

    const defaultPatientId = response.patients[0].id;

    // Create mock data for moods, meditations, and medication adherence events
    createMoodEntries(patientsUrl, clientSecret, authToken, defaultPatientId, 1)
    createMeditationEntries(patientsUrl, clientSecret, authToken, defaultPatientId, 1)

    if (!init) {
      const medicationsResponse = await getMedications(authToken, defaultPatientId)
      const { medications } = medicationsResponse

      createMedicationAdherence(patientsUrl, clientSecret, authToken, defaultPatientId, medications, 1);
    } else {
      const clinicianAuthResponse = await authenticate(email2, password2);

      clinicianAuthToken = clinicianAuthResponse;
      // Add two medications to the user
      // let medications = []
      // createMedication(ibuMedArgs, defaultPatientId, function (response) {
      //   console.log("created MEd!!", response);
      //   medications.push(response)
      //   createMedication(aspirinMedArgs, defaultPatientId, function (response) {
      //     console.log("Created MEd 2!!", response);
      //     medications.push(response)
      //     createMedicationAdherence(authToken, defaultPatientId, medications, 20);
    }
  } catch (e) {
    logger.info(`Error generating mock patient data. Set log LOG_LEVEL to 'debug' for details.`);
    logger.debug(e);
  }
}

produceData()
