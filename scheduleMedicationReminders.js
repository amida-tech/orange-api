const mongoose = require("mongoose");
const cron = require('node-cron');
const moment = require('moment-timezone');

const User = mongoose.model("User");
const Patient = mongoose.model("Patient");
const ReminderNotification = mongoose.model("ReminderNotification");
const intervalInMinutes = 1;
const bufferInMilliseconds = 5000;

function checkIfSent(key) {
  return new Promise((resolve, reject) => {
   ReminderNotification.findOneAndUpdate(
     {_id: key, sent: true},
     {_id: key, sent: true},
     {upsert: true, new: false, runValidators: true},
     function (err, doc) {
         if (err) {
             reject(err)
         } else {
             resolve(doc)
         }
     }
   );
  })
}

function sendNotifications(patient, item, user) {
  const key = `${patient._id}_${item.medication_id}_${item.notification}`
  checkIfSent(key).then((result) => {

   if (!result) {
       const dateFormat = item.type === 'time' ? 'h:mm a' : 'MMM Do YY'
       const notificationTitle = 'Reminder'
       const notificationMessage = `Your scheduled task is due by ${moment(item.date).tz(patient.tz).format(dateFormat)}`
       console.log("SENDING NOTIFICATION: ", notificationMessage);
       user.sendPushNotification({
           notificationType: "MEDICATION_REMINDER",
           title: notificationTitle,
           body: notificationMessage
       });
   }
  });

}


function sendMedicationReminders() {
   console.log("CHECKING FOR NOTIFICATIONS");
   const time = Date.now()
   const intervalInMilliseconds = intervalInMinutes * 60 * 1000;
   const startTime = new Date(time - bufferInMilliseconds)
   const startTimeISO = startTime.toISOString();
   const endTime = new Date(time + intervalInMilliseconds + bufferInMilliseconds);
   const endTimeISO = endTime.toISOString();
   User.find({}, function(err, users) {
    users.forEach((user) => {
     Patient.findOne({ creator: user.email, me: true }).exec().then((patient) => {
      patient.generateScheduleResults(startTimeISO, endTimeISO, user, null, user._id, function (err, items) {
          if (err) return err;
          items = items.map(function (medItems) {
              return medItems.map(function (item) {
                  item.patient_id = patient._id;
                  return item;
              });
          });
          Patient.formatSchedule(items, function (err, result) {
              if (err) return err;
              var schedule = result.schedule;
              schedule.forEach((item) => {
                const notificationDate = new Date(item.notification);
                if (notificationDate >= startTime && notificationDate <= endTime) {
                  sendNotifications(patient, item, user)
                }
              })
          });
      });
     });
    })
  });

}

cron.schedule(`*/${intervalInMinutes} * * * *`, sendMedicationReminders);
