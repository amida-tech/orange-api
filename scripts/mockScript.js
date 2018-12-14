const Client = require('node-rest-client').Client;
const faker = require('faker');
import createJournalEntry from './createRecordsScript'

//Notification Service Admin User Credentials
const adminUsername = (process.argv[6] ? `${process.argv[6]}`: `oucuYaiN6pha3ahphiiT`);
const adminPassword = (process.argv[7] ? `${process.argv[7]}`: `@TestTest1`);

//User & Patient data generated by faker
const firstName = faker.name.firstName().toLowerCase();
const lastName = faker.name.lastName().toLowerCase();
const phoneNumber = faker.phone.phoneNumberFormat().split('-').join('');
const email = firstName + "+patient@amida.com";
const password = "Testtest1!";
const doctorEmail = "mholmes@amida-demo.com";
const access = ["read","write","default"];
const testArray = [];

//URL's
// const authUrl = `${process.argv[2]}/auth/login`;  //"http://localhost:4000/api/v1/auth/login"
// const patientsUrl = `${process.argv[3]}/patients`;   //"http://localhost:5000/v1/patients"
// const createUserUrl = `${process.argv[3]}/user`;    //"http://localhost:5000/v1/user"
// const messagingUrl = `${process.argv[4]}/threads`;   //"http://localhost:4001/api/v1/threads"
// const notificationsUrl = `${process.argv[5]}/notifications/sendPushNotifications`;   //"http://localhost:4003/api/notifications/sendPushNotifications";

const authUrl = "http://localhost:4000/api/v1/auth/login"
const patientsUrl = "http://localhost:5000/v1/patients"
const createUserUrl = "http://localhost:5000/v1/user"
const messagingUrl = "http://localhost:4001/api/v1/threads"
const notificationsUrl = "http://localhost:4003/api/notifications/sendPushNotifications";


var authToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6NywidXNlcm5hbWUiOiJSdWJ5ZUBhbWlkYS5jb20iLCJlbWFpbCI6IlJ1YnllQGFtaWRhLmNvbSIsInNjb3BlcyI6WyIiXSwiaWF0IjoxNTIwMjY5OTA5LCJleHAiOjE1MjAyNzY1MDl9.lBsjsQtHxuI8E5C7VHaxkulZZugkbk0FFYl_rT580Bo';
const client = new Client();


const createUser = function(userArgs, callback) {
    client.post(createUserUrl, userArgs, function (data, response) {
        callback(data);
    });
};
const authenticateUser = function(authArgs, callback) {
    client.post(authUrl, authArgs, function (data, response) {
        callback(data.token);
    });

};
const createPatient = function(patientArgs, callback) {
    client.post(patientsUrl, patientArgs, function (data, response) {
        callback(data);
    });
};
const createThread = function(threadArgs, callback) {
    client.post(messagingUrl, threadArgs, function (data, response) {
        callback(data.message);
    });
};
const replyToThread = function(threadArgs, threadID, callback) {
    client.post(`${messagingUrl}/thread/${threadID}/reply`, threadArgs, function (data, response) {
        callback(data.message);
    });
};
const getPatients = function(patientArgs, callback) {
    client.get(patientsUrl, patientArgs, function (data, response) {
        callback(data);
    });
};
const sharePatient = function(patientArgs, patientId, callback) {
    client.post(`${patientsUrl}/${patientId}/shares`, patientArgs, function (data, response) {
        callback(data);
    });
};
const createDoctor = function(doctorArgs, patientId, callback) {
    client.post(`${patientsUrl}/${patientId}/doctors`, doctorArgs, function (data, response) {
        callback(data);
    });
};
const notifyUser = function(notificationArgs, callback) {
    client.post(notificationsUrl, notificationArgs, function (data, response) {
        callback(data, response);
    });
};


const userArgs = {
    headers: { "Content-Type": "application/json", "X-Client-Secret" : "testsecret" },
    data: {
        "email": email,
        "password": password,
        "first_name": firstName,
        "last_name": lastName,
        "phone": phoneNumber,
        "role": "user"
    }
};
const authArgs = {
    headers : {"Content-Type": "application/json", "X-Client-Secret" : "testsecret"},
    data: {
        "username":     email,
        "password":  password
    }
};


const sendNotification = function () {
    const adminAuthArgs = {
        headers : {"Content-Type": "application/json", "X-Client-Secret" : "testsecret"},
        data: {
            "username": adminUsername,
            "password": adminPassword
        }
    };
    
    authenticateUser(adminAuthArgs, function (response) {
        authToken = response;
        const notificationArgs = {
            headers : {"Content-Type": "application/json", "Authorization":"Bearer "+authToken},
            data: {
                "pushData": [{ 
                        "username": email,
                        "notificationType": "New Message",
                        "data": {
                            "title": `${email} sent you a message`,
                            "body": "Test message"
                        }
                    }]
            }
        };
        notifyUser(notificationArgs, function (data, response) {
            if (data.success) {
                console.log(" ✅ Notification service running and configured with microservice Admin user");
                testArray.push({test: 'auth & orange-api', pass: true});
            } else {
                console.log(" ❌ Notification service not functioning / not configured with microservice Admin user");
                testArray.push({test: 'auth & orange-api', pass: false});
            }
        });
    });

}

const seedMessages = function (patientArgs) {
    //data for a new user to be included in the message thread
    const firstName2 = faker.name.firstName();
    const lastName2 = faker.name.lastName();
    const phoneNumber2 = faker.phone.phoneNumberFormat().split('-').join('');
    const email2 = firstName2+"+clinician@amida.com";
    const password2 = "Testtest1!";
    var authToken2 = '';
    var threadID = null;

    const newUserArgs = {
        headers: { "Content-Type": "application/json", "X-Client-Secret" : "testsecret" },
        data: {
            "email": email2,
            "password": password2,
            "first_name": firstName2,
            "last_name": lastName2,
            "phone": phoneNumber2,
            "role": "user"
        }
    };
    const authArgs = {
        headers : {"Content-Type": "application/json", "X-Client-Secret" : "testsecret"},
        data: {
            "username":     email2,
            "password":  password2
        }
    };
    const createThreadArgs = {
        headers: {"Content-Type": "application/json", "Authorization":"Bearer "+authToken},
        data: {
            "participants": [email, email2],
            "message": "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Pellentesque pellentesque velit quis urna finibus, at dapibus orci sagittis. Sed gravida, metus id elementum efficitur, urna enim mattis augue, nec ornare velit sem dapibus urna.",
            "topic": `${firstName2}'s log`,
        }
    };
    var respondToThreadArgs = {
        headers: {"Content-Type": "application/json", "Authorization":"Bearer "+authToken2},
        data: {
            "message": "Fusce imperdiet dui est, ut varius dolor ultricies at. Praesent eget magna in est facilisis maximus quis ac ligula. Phasellus ultricies arcu tincidunt quam placerat, sit amet eleifend lacus sodales. Mauris condimentum placerat sem. Etiam placerat massa at rhoncus egestas.",
        }
    };
    const doctorArgs = {
        headers: { "Content-Type": "application/json", "X-Client-Secret" : "testsecret", "Authorization":"Bearer "+authToken},
        data: {
            "name": "Dr. Burress",
            "phone": "(617) 617-6177",
            "address": "N Calvert Street, DC, 20052",
            "notes": "Head of my Care Team",
            "title": "Primary Care Physician"
        }
    };



    // Create a second user inside the seedMessages function call
    createUser(newUserArgs, function(response) {
        if (response.email) {
            console.log("Created User2: ", response.email);
            console.log(" ✅ Orange-API and Auth Service are working correctly to create users and authenticate");
            testArray.push({test: 'auth & orange-api', pass: true});
        } else {
            console.log(" ❌ Orange-API and Auth Service are not working correctly together");
            testArray.push({test: 'auth & orange-api', pass: false});
        }
        // sendNotification();

        // Get first user's patient and share it with the new user
        getPatients(patientArgs, function(response){
            const defaultPatientId = response.patients[0].id;
            const sharePatientArgs = {
                headers: {"Content-Type": "application/json", "X-Client-Secret" : "testsecret", "Authorization":"Bearer "+authToken},
                data: {
                    "email": email2,
                    "access": "write",
                    "group": "family"
                }
            };
            sharePatient(sharePatientArgs, defaultPatientId, function(response) {
                createDoctor(doctorArgs, defaultPatientId, function(response) { 
                    // console.log("Checking result of doctor creation", response);
                    authenticateUser(authArgs, function (response) {
                        authToken2 = response;
                        createThread(createThreadArgs, function (response){
                            console.log("debug: ", response);
                            console.log("Created Thread At: ", response.createdAt);
                            threadID = response.ThreadId;

                            //update ThreadArgs to include newly recieved authToken
                            respondToThreadArgs.headers.Authorization = "Bearer "+authToken2;
                            replyToThread(respondToThreadArgs, threadID, function (response) {
                                if (response.createdAt) {
                                    console.log("Reply To Thread At: ", response.createdAt);
                                    console.log(" ✅ Messaging service is running in conjunction with the auth service");
                                    testArray.push({test: 'messaging', pass: true});
                                } else {
                                    console.log(" ❌ Messaging service is not running in conjunction with the auth service");
                                    testArray.push({test: 'messaging', pass: false});
                                }
                                const failingTests = testArray.filter((test) => !test.pass);
                                // console.log("failingTests", failingTests);
                                console.log(`${testArray.length - failingTests.length}/3 tests are passing`);

                            });
                        });
                    });
                });
            });
        });
    });
}

createUser(userArgs, function(response) {
    console.log("Created User: ", response.email);
    authenticateUser(authArgs, function (response) {
        authToken = response;
        const patientArgs = {
            headers: {"Content-Type": "application/json", "X-Client-Secret" : "testsecret", "Authorization":"Bearer "+authToken},
            data: {
            }
        };
        seedMessages(patientArgs);
    });
});


