const mongoose = require("mongoose");
const cron = require('node-cron');
// var User = mongoose.model("User");
var User = require('./lib/models/user/user');
var User = require('./lib/models/patient/patient');
var ReminderNotification = require('./lib/models/reminder_notification');
const intervalInMinutes = 5;

function checkIfSent(key) {
  return new Promise((resolve, reject) => {
   ReminderNotification.findOneAndUpdate(
   {_id: key, sent: true}, // find a document with that filter
   {_id: key, sent: true}, // document to insert when nothing was found
   {upsert: true, new: false, runValidators: true}, // options
   function (err, doc) { // callback
       if (err) {
           reject(err)
       } else {
           resolve(doc)
       }
   }
  );
  })
}

function sendNotifications(patientId, item, user) {
  const key = `${patientId}_${item.medication_id}_${event.notification}`
  checkIfSent(key).then((result) => {
   if (!result) {
       const dateFormat = even.type === 'time' ? 'h:mm a' : 'MMM Do YY'
       const notificationTitle = 'Reminder'
       const notificationMessage = `Your scheduled task is due by ${moment(event.date).format(dateFormat)}`
       user.sendPushNotification({
           notificationType: "MEDICATION_REMINDER",
           title: notificationTitle,
           body: notificationMessage
       });
   }
  });

}


function sendMedicationReminders() {
   const currentTime = new Date();
   const startTime = moment(currentTime).add(intervalInMinutes, 'm').toDate().toISOString();
   const endTime = moment(startTime).add(intervalInMinutes, 'm').toDate().toISOString();
   User.find({}, function(err, users) {
    users.forEach((user) => {
     Patient.findOne({ creator: user.email, me: true }).exec().then((patient) => {
      patient.generateScheduleResults(startTime, endTime, user, null, user._id, function (err, items) {
          if (err) return err;

          // add patient ID
          // iterate over medications
          items = items.map(function (medItems) {
              // iterate over schedule items
              return medItems.map(function (item) {
                  item.patient_id = patient._id;
                  return item;
              });
          });
          items.forEach((item) => {
               sendNotifications(patient._id, item, user)
          })
      });
     });
    })


  });

}

module.exports = () => {
 cron.schedule(`*/${intervalInMinutes} * * * * *`, sendMedicationReminders);
}
