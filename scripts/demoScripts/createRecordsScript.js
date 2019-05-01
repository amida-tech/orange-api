const util = require('util');

const axios = require('axios');
const Client = require('node-rest-client').Client;
const moment = require('moment')
const jwt = require('jsonwebtoken')
const logger = require ('./winston.js');

const client = new Client();

// function to make journal entries
const createJournalEntry = function(baseUrl, journalArgs, patientID, callback) {
  client.post(`${baseUrl}/${patientID}/journal`, journalArgs, function (data, response) {
    callback(data);
  });
}

async function createDose (clientSecret, token, baseUrl, patientId, body) {
  let username;
  try {
    username = jwt.decode(token).username;
    const response = await axios({
      method: 'post',
      url: `${baseUrl}/${patientId}/doses`,
      headers: {
        'Content-Type': 'application/json',
        'X-Client-Secret': clientSecret,
        'Authorization': `Bearer ${token}`
      },
      data: body
    });
    logger.debug(`Creating dose successful for user ${username}. Response body is:`, response.data);
    return response.data;
  } catch (e) {
    logger.info(`Creating dose failed for user ${username}`);
    logger.debug(util.inspect(e));
    // TODO: Perhaps do something here.
  }
}

module.exports.createMoodEntries = function(baseUrl, clientSecret, authToken, patientID, days) {
  const user = jwt.decode(authToken)
  let date = moment().endOf('day').subtract(days, 'days')
  for (var y=0; y<days; y++) {
    date.add(1, 'days')
    const hourlydate = moment(date)
    for (var x = 0; x<4; x++ ) {
      hourlydate.subtract(5, 'hours')
      const moodSeverity = Math.floor(Math.random() * 9) + 1;
      const providedDate = moment(hourlydate).utc().toISOString()
      const journalArgs = {
        headers: { "Content-Type": "application/json", "X-Client-Secret" : clientSecret, "Authorization":"Bearer "+authToken},
        data: {  
          date: { 
            utc: providedDate,
            timezone:"America/New_York"
          },
          role:"user",
          creator: user.username,
          mood: 'General Mood',
          moodSeverity
        }
      }
      createJournalEntry(baseUrl, journalArgs, patientID, function(response) {
        if (response.status === 'ERROR') {
          console.log("UNSuccesful createMoodEntries", response, journalArgs);
        }
      });
    }
  }

}

module.exports.createMeditationEntries = function(baseUrl, clientSecret, authToken, patientID, days) {
  const user = jwt.decode(authToken)
  let date = moment().endOf('day').subtract(days, 'days')
  for (var y=0; y<days; y++) {
    date.add(1, 'days')
    const hourlydate = moment(date)

    // Schedule a morning and evening meditation event
    let meditations = []
    meditations.push(moment(hourlydate).subtract(6, 'hours'))
    meditations.push(moment(hourlydate).subtract(7, 'hours'))
    meditations.push(moment(hourlydate).subtract(13, 'hours'))
    meditations.push(moment(hourlydate).subtract(15, 'hours'))
    meditations.map((event) => {
      const doesMeditationHappen = Math.random();
      if (doesMeditationHappen > 0.25) {
        const providedDate = moment(event).utc().toISOString()
        const journalArgs = {
          headers: { "Content-Type": "application/json", "X-Client-Secret" : clientSecret, "Authorization":"Bearer "+authToken},
          data: {  
            date: { 
              utc: providedDate,
              timezone:"America/New_York"
            },
            role:"user",
            creator: user.username,
            activity: 'Meditation',
            activityMinutes: 20
          }
        }
        createJournalEntry(baseUrl, journalArgs, patientID, function(response) {
          if (response.status === 'ERROR') {
            console.log("UNSuccesful createMeditationEntries", response, journalArgs);
          }
        });
      }
    })
      
  }

}


module.exports.createMedicationAdherence = async function (baseUrl, clientSecret, authToken, patientID, medications, days) {
  let date = moment().endOf('day').subtract(days, 'days')
  for (var y=0; y<days; y++) {
    date.add(1, 'days')
    const hourlydate = moment(date).subtract(13, 'hours')

    for (let med of medications) {
      const medicationTaken = Math.random();
      const providedDate = moment(hourlydate).utc().toISOString()
      const doseArgs = {
        headers: { "Content-Type": "application/json", "X-Client-Secret" : clientSecret, "Authorization":"Bearer "+authToken},
        data: {  
          date: { 
            utc: providedDate,
            timezone:"America/New_York"
          },
          medication_id: med.id,
          taken: (medicationTaken > 0.2),
          scheduled: 0
        }
      }

      await createDose(clientSecret, authToken, baseUrl, patientID, {
        date: {
          utc: providedDate,
          timezone:"America/New_York"
        },
        medication_id: med.id,
        taken: (medicationTaken > 0.2),
        scheduled: 0
      });
    }
  }

}
