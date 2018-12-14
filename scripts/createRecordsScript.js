const Client = require('node-rest-client').Client;
const moment = require('moment')
const jwt = require('jsonwebtoken')
const client = new Client();
const createJournalEntryUrl = 'http://localhost:5000/v1/patients/2739/journal'

// function to make journal entries
const createJournalEntry = function(journalArgs, patientID, callback) {
  client.post(`http://localhost:5000/v1/patients/${patientID}/journal`, journalArgs, function (data, response) {
    callback(data);
  });
}

const createDose = function(doseArgs, patientID, callback) {
  client.post(`http://localhost:5000/v1/patients/${patientID}/doses`, doseArgs, function (data, response) {
    callback(data);
  });
}

module.exports.createMoodEntries = function(authToken, patientID, days) {
  const user = jwt.decode(authToken)
  let date = moment().endOf('day').subtract(days, 'days')
  for (var y=0; y<days; y++) {
    date.add(1, 'days')
    const hourlydate = moment(date)
    for (var x = 0; x<10; x++ ) {
      hourlydate.subtract(2, 'hours')
      const moodSeverity = Math.floor(Math.random() * 9) + 1;
      const providedDate = moment(hourlydate).utc().toISOString()
      const journalArgs = {
        headers: { "Content-Type": "application/json", "X-Client-Secret" : "testsecret", "Authorization":"Bearer "+authToken},
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
      createJournalEntry(journalArgs, patientID, function(response) {
        if (response.status === 'ERROR') {
          console.log("UNSuccesful createJournalEntry", response, journalArgs);
        }
      });
    }
  }

}

module.exports.createMeditationEntries = function(authToken, patientID, days) {
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
          headers: { "Content-Type": "application/json", "X-Client-Secret" : "testsecret", "Authorization":"Bearer "+authToken},
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
        createJournalEntry(journalArgs, patientID, function(response) {
          if (response.status === 'ERROR') {
            console.log("UNSuccesful createJournalEntry", response, journalArgs);
          }
        });
      }
    })
      
  }

}


module.exports.createMedicationAdherence = function(authToken, patientID, medications, days) {
  const user = jwt.decode(authToken)
  let date = moment().endOf('day').subtract(days, 'days')
  for (var y=0; y<days; y++) {
    date.add(1, 'days')
    const hourlydate = moment(date).subtract(13, 'hours')

    medications.map((med) => {
      const medicationTaken = Math.random();
      const providedDate = moment(hourlydate).utc().toISOString()
      const doseArgs = {
        headers: { "Content-Type": "application/json", "X-Client-Secret" : "testsecret", "Authorization":"Bearer "+authToken},
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
      createDose(doseArgs, patientID, function(response) {
        if (response.status === 'ERROR') {
          console.log("UNSuccesful createJournalEntry", response, doseArgs);
        }
      });
    })
      
  }

}