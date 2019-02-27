const Client = require('node-rest-client').Client;
const { createMoodEntries, createMeditationEntries, createMedicationAdherence } =  require('./createRecordsScript');

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


const authenticateUser = function(authArgs, callback) {
  client.post(authUrl, authArgs, function (data, response) {
    callback(data.token);
  });

};
const getPatients = function(patientArgs, callback) {
  client.get(patientsUrl, patientArgs, function (data, response) {
    callback(data);
  });
};
const createMedication = function(medArgs, patientId, callback) {
  client.post(`${patientsUrl}/${patientId}/medications`, medArgs, function (data, response) {
    callback(data, response);
  });
};
const getMedications = function(medArgs, patientId, callback) {
  client.get(`${patientsUrl}/${patientId}/medications`, medArgs, function (data, response) {
    callback(data, response);
  });
};

const authArgsPatient = {
  headers : {"Content-Type": "application/json", "X-Client-Secret" : clientSecret},
  data: {
    "username":     email,
    "password":  password
  }
};


const produceData = function (patientArgs) {
  //data for a new user to be included in the message thread

  var authToken2 = '';

  const authArgsClinician = {
    headers : {"Content-Type": "application/json", "X-Client-Secret" : clientSecret},
    data: {
      "username":     email2,
      "password":  password2
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

  const medArgs = {
    headers: { "Content-Type": "application/json", "X-Client-Secret" : clientSecret, "Authorization":"Bearer "+authToken},
    data: {}
  }



  // Get first user's patient and share it with the new user
  getPatients(patientArgs, function(response){
    const defaultPatientId = response.patients[0].id;



    // Create mock data for moods, meditations, and medication adherence events
    createMoodEntries(patientsUrl, clientSecret, authToken, defaultPatientId, 1)
    createMeditationEntries(patientsUrl, clientSecret, authToken, defaultPatientId, 1)
        
    // If we are using existing users, create a medication adherence event
    if (!init) {
      getMedications(medArgs, defaultPatientId, function(response){
        const medications = response.medications

        createMedicationAdherence(patientsUrl, clientSecret, authToken, defaultPatientId, medications, 31);

      });
    } else {

      // Else, add two medications to the new user
      authenticateUser(authArgsClinician, function (response) {
        authToken2 = response;
        let medications = []
        createMedication(ibuMedArgs, defaultPatientId, function (response) {
          console.log("created first medication", response);
          medications.push(response)
          createMedication(aspirinMedArgs, defaultPatientId, function (response) {
            console.log("created second medication", response);
            medications.push(response)
            createMedicationAdherence(authToken, defaultPatientId, medications, 20);


          });
        });
      });
    }



  });
}

authenticateUser(authArgsPatient, function (response) {
    authToken = response;
    const patientArgs = {
        headers: {"Content-Type": "application/json", "X-Client-Secret" : clientSecret, "Authorization":"Bearer "+authToken},
        data: {
        }
    };
    produceData(patientArgs);
});


