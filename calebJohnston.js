var moment = require('moment');
var moment = require('moment-timezone');
var Client = require('node-rest-client').Client;
var getPatientsUrl = "http://localhost:5000/v1/patients";
var createUserUrl = "http://localhost:5000/v1/user";
var authUrl = "http://localhost:4000/api/v0/auth/login";
var access = ["read","write","default"];
var medicationName = "Cleocin";
var client = new Client();
var date = new Date();
//var dateNow = date.toISOString();
//var res_date = moment().tz("America/New_York").subtract(1, 'days').hours(13).minutes(30).toISOString();
//dateNow.split('T')[0].split('-')[2] - 1;
//console.log("res_date=====", res_date);
//create user
var userArgs = {
        headers: { "Content-Type": "application/json", "X-Client-Secret" : "testsecret" },
        data: {
                "email": "cjohnston@amida-demo.com",
                "password": "testtest",
                "first_name": "Caleb",
                "last_name": "Johnston",
                "phone": "5554441234"
        }
    };

client.post(createUserUrl, userArgs, function (data, response) {
       console.log(data);
});

//get patient id for the user created

var authArgs = {
        headers:    {"Content-Type": "application/json", "X-Client-Secret" : "testsecret"},
        data:       {
                        "email":     "cjohnston@amida-demo.com",
                        "password":  "testtest"
        }
};
client.post(authUrl, authArgs, function (data, response) {
            // parsed response body as js object
            //console.log(data.access_token);

            var access_token = data.access_token;
            var patientArgs = {
                        headers: {"Content-Type": "application/json", "X-Client-Secret" : "testsecret", "Authorization":"Bearer "+access_token}
            };
            client.get(getPatientsUrl, patientArgs, function (data, response) {

                	var patientId = data.patients[0].id;
                	//adding medication
                	var addMedicationUrl = "http://localhost:5000/v1/patients/"+patientId+"/medications";
                	var medicationArgs = {
                	                headers: {"Content-Type": "application/json", "X-Client-Secret" : "testsecret", "Authorization":"Bearer "+access_token},
                                    data: {
                                          "name": medicationName,
                                          "dose": {
                                                "quantity": 150,
                                                "unit": "mg"
                                          },
                                          "quantity": 1,
                                          "schedule":{
                                                     "as_needed": false,
                                                     "regularly": true,
                                                     "until": { "type": "number", "stop": 40},
                                                     "frequency": { "n": 4, "unit": "day" },
                                                     "times":[
                                                             {"type": "exact", "time": "01:00"},
                                                             {"type": "exact", "time": "07:00"},
                                                             {"type": "exact", "time": "13:00"},
                                                             {"type": "exact", "time": "20:00"}
                                                     ],
                                                     "take_with_food": null,
                                                     "take_with_medications": [],
                                                     "take_without_medications": []
                                           }

                                    }
                	}
                	client.post(addMedicationUrl, medicationArgs, function (data, response) {
                	    //console.log(data.schedule);
                	});

                    //2. scheduled drug
                    var addMedicationUrl = "http://localhost:5000/v1/patients/"+patientId+"/medications";
                    var medicationArgs = {
                                    headers: {"Content-Type": "application/json", "X-Client-Secret" : "testsecret", "Authorization":"Bearer "+access_token},
                                    data: {
                                          "name": "Vivitrol",
                                          "dose": {
                                                "quantity": 380,
                                                "unit": "mg"
                                          },
                                          "quantity": 1,
                                          "schedule":{
                                                     "as_needed": false,
                                                     "regularly": true,
                                                     "until": { "type": "number", "stop": 40},
                                                     "frequency": { "n": 1, "unit": "month" },
                                                     "times":[
                                                             {"type": "exact", "time": "09:13 am"}
                                                     ],
                                                     "take_with_food": null,
                                                     "take_with_medications": [],
                                                     "take_without_medications": []
                                           }

                                    }
                    }
                    client.post(addMedicationUrl, medicationArgs, function (data, response) {
                        console.log(data);
                        console.log("patientid", patientId);
                        var medicationId = data.id;
                        console.log("medication id", medicationId);
                        //3. drug taken event
                            var doseAccessUrl = "http://localhost:5000/v1/patients/"+patientId+"/doses";
                            var doseArgs = {
                                headers: {"Content-Type": "application/json", "X-Client-Secret" : "testsecret", "Authorization":"Bearer "+access_token},
                                data:    {
                                          "medication_id": medicationId,
                                          "date": moment().tz("America/New_York").subtract(1, 'days').hours(9).minutes(26).toISOString(),
                                          "taken": true
                                }
                            };
                            client.post(doseAccessUrl, doseArgs, function (data, response){
                                    console.log(data);
                            });
                    });

                     // sharing user log with jsparks@amida-demo.com
                    var getAccessUrl = "http://localhost:5000/v1/patients/"+patientId+"/shares/";
                    var accessArgs = {
                        headers: {"Content-Type": "application/json", "X-Client-Secret" : "testsecret", "Authorization":"Bearer "+access_token},
                	    data: {
                                "email":  "jsparks@amida-demo.com",
               	                "access": "write",
               	                "group" : "anyone"
                        }
                    };
                    client.post(getAccessUrl, accessArgs, function (data, response) {

                    });


                    //adding notes and events to cjohnston
                    //adding calender event
                    // 4. counselling event
                    var calenderEventUrl = "http://localhost:5000/v1/patients/"+patientId+"/events";
                    var calenderEventArgs = {
                        headers: {"Content-Type": "application/json", "X-Client-Secret" : "testsecret", "Authorization":"Bearer "+access_token},
                        data:    {
                                    "date": moment().tz("America/New_York").subtract(1, 'days').hours(10).minutes(0).toISOString(),
                                    "location": "Mental Health and Counseling office",
                                    "name": "Benefits Consultation",
                                    "description": "Weekly checkup",
                                    "eventLength": 60
                        }
                    }
                    client.post(calenderEventUrl, calenderEventArgs, function(data, response){
                         console.log("calender event ",data);
                    });

                    var eventAccessUrl = "http://localhost:5000/v1/patients/"+patientId+"/journal";
                    //journal entry
                    //5.  meditation event
                    var eventArgs = {
                        headers: {"Content-Type": "application/json", "X-Client-Secret" : "testsecret", "Authorization":"Bearer "+access_token},
                        data:    {
                                  "date":    moment().tz("America/New_York").subtract(1, 'days').hours(12).minutes(30).toISOString(),
                                  "text":    "10 minutes",
                                  "mood": "nauseated, irritable",
                                  "meditation": true,
                                  "meditationLength": 10,
                                  "success": true
                        }
                    };
                    client.post(eventAccessUrl, eventArgs, function (data, response){
                        //console.log(data);
                    });

                    //journal entry
                    //6. patient's note
                    var eventArgs = {
                        headers: {"Content-Type": "application/json", "X-Client-Secret" : "testsecret", "Authorization":"Bearer "+access_token},
                        data:    {
                                  "date":    moment().tz("America/New_York").subtract(1, 'days').hours(12).minutes(32).toISOString(),
                                  "text":    "Ask about nausea, dizziness when lying down",
                                  "success": true
                        }
                    };
                    client.post(eventAccessUrl, eventArgs, function (data, response){
                        //console.log(data);
                    });

                    //7. calender event
                    var calenderEventArgs = {
                        headers: {"Content-Type": "application/json", "X-Client-Secret" : "testsecret", "Authorization":"Bearer "+access_token},
                        data:    {
                                    "date": moment().tz("America/New_York").subtract(1, 'days').hours(14).minutes(30).toISOString(),
                                    "name": "Benefits Consultation",
                                    "eventLength":60
                        }
                    }
                    client.post(calenderEventUrl, calenderEventArgs, function(data, response){
                         console.log("calender event ",data);
                    });
                    //creating user account Jessica Sparks
                    var userArgs2 = {
                            headers: { "Content-Type": "application/json", "X-Client-Secret" : "testsecret" },
                            data: {
                                    "email": "jsparks@amida-demo.com",
                                    "password": "testtest",
                                    "first_name": "Jessica",
                                    "last_name": "Sparks",
                                    "phone": "9876543210"
                            }
                        };

                    client.post(createUserUrl, userArgs2, function (data, response) {
                           console.log(data);
                    });

                    var authArgs = {
                            headers:    {"Content-Type": "application/json", "X-Client-Secret" : "testsecret"},
                            data:       {
                                            "email":     "jsparks@amida-demo.com",
                                            "password":  "testtest"
                            }
                    };

                    //jessica adds journal entry for caleb 8:45 am
                    // 1. physician note
                    client.post(authUrl, authArgs, function (data, response) {
                                // parsed response body as js object
                                //console.log(data.access_token);

                                var access_token2 = data.access_token;
                                var patientArgs = {
                                    headers: {"Content-Type": "application/json", "X-Client-Secret" : "testsecret", "Authorization":"Bearer "+access_token2},
                                    data: {
                                        "date": moment().tz("America/New_York").subtract(1, 'days').hours(8).minutes(45).toISOString(),
                                        "text": "Initial consultation performed. Hx of opiate/alcohol abuse, Anxiety & Depression. Post-tussive vomiting episode in ED x2. Provided CXR reveals minor fluid buildup.",
                                        "mood": "anxious, depressed",
                                        "success": true
                                    }
                                }
                                client.post(eventAccessUrl, patientArgs, function (data, response){
                                    console.log("jessica adds entry for caleb",data);
                                });
                                //jessica adds journal entry for caleb 1:15 pm
                                // 2. physician note
                                client.post(authUrl, authArgs, function (data, response) {
                                            // parsed response body as js object
                                            //console.log(data.access_token);

                                            var access_token = data.access_token;
                                            var patientArgs = {
                                                headers: {"Content-Type": "application/json", "X-Client-Secret" : "testsecret", "Authorization":"Bearer "+access_token2},
                                                data: {
                                                    "date": moment().tz("America/New_York").subtract(1, 'days').hours(13).minutes(15).toISOString(),
                                                    "text": "PT reported nausea and dizziness. Advised bedrest and light diet. Nausea likely withdrawal related. Repeat CXR if continued post-tussive vomiting. Candidate for US guided thoracentesis w/ Pleural-Effusion increase.",
                                                    "mood": "nauseated, Dizzy",
                                                    "success": true
                                                }
                                            }
                                            client.post(eventAccessUrl, patientArgs, function (data, response){
                                                console.log("jessica adds entry for caleb 2",data);
                                            });
                                });

                                //jessica adds journal entry for caleb 3:08 pm
                                // 3. physician note
                                client.post(authUrl, authArgs, function (data, response) {
                                            // parsed response body as js object
                                            //console.log(data.access_token);

                                            var access_token = data.access_token;
                                            var patientArgs = {
                                                headers: {"Content-Type": "application/json", "X-Client-Secret" : "testsecret", "Authorization":"Bearer "+access_token2},
                                                data: {
                                                    "date": moment().tz("America/New_York").subtract(1, 'days').hours(15).minutes(08).toISOString(),
                                                    "text": "Discharged",
                                                    "success": true
                                                }
                                            }
                                            client.post(eventAccessUrl, patientArgs, function (data, response){
                                                console.log("jessica adds entry for caleb 3",data);
                                            });

                    });


                    });
                });



});




//granting jessica sparks access to all 30 accounts
   // getting access_token and patient info

for(var i=1; i<31; i++){
    var userEmail = "amida"+i+"@amida-demo.com";
    var password = "testtest";
    var authArgs = {
        headers : {"Content-Type": "application/json", "X-Client-Secret" : "testsecret"},
        data:     {
                        "email":     userEmail,
                        "password":  password
        }
    }

    client.post(authUrl, authArgs, function (data, response) {
            // parsed response body as js object
            //console.log(data.access_token);
            var access_token = data.access_token;
            var patientArgs = {
                        headers: {"Content-Type": "application/json", "X-Client-Secret" : "testsecret", "Authorization":"Bearer "+access_token}
            };
            client.get(getPatientsUrl, patientArgs, function (data, response) {
                    // provide access to the doctor
                    var getAccessUrl = "http://localhost:5000/v1/patients/"+data.patients[0].id+"/shares/";
                    var accessArgs = {
                        headers: {"Content-Type": "application/json", "X-Client-Secret" : "testsecret", "Authorization":"Bearer "+access_token},
                        data: {
                                  "email":  "jsparks@amida-demo.com",
                                  "access": access[Math.floor(Math.random()*access.length)],
                                  "group" : "anyone"
                        }
                    };
                    client.post(getAccessUrl, accessArgs, function (data, response) {
                            // parsed response body as js object
                            //console.log(data);
                    });
            });
     });
}