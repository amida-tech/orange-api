
var Client = require('node-rest-client').Client;
var faker = require('faker');

var firstName = faker.name.firstName();
var lastName = faker.name.lastName();
var phoneNumber = faker.phone.phoneNumberFormat().split('-').join('');
var doctorEmail = "mholmes@amida-demo.com";
var authUrl = "http://localhost:5000/v1/auth/token";
var getPatientsUrl = "http://localhost:5000/v1/patients";
var createUserUrl = "http://localhost:5000/v1/user";
var client = new Client();
var access = ["read","write","default"];

for(var i=1; i<31; i++){
    //creating 30 users
    var firstName = faker.name.firstName();
    var lastName = faker.name.lastName();
    var phoneNumber = faker.phone.phoneNumberFormat().split('-').join('');
    var email = "amida"+i+"@amida-demo.com";
    var password = "testtest";
    var userArgs = {
        headers: { "Content-Type": "application/json", "X-Client-Secret" : "testsecret" },
        data: {
                "email": email,
                "password": password,
                "first_name": firstName,
                "last_name": lastName,
                "phone": phoneNumber
        }
    };
    client.post(createUserUrl, userArgs, function (data, response) {
        // parsed response body as js object
        //console.log(data);
    });

    // getting access_token and patient info
    var authArgs = {

        headers : {"Content-Type": "application/json", "X-Client-Secret" : "testsecret"},
        data:     {
                        "email":     email,
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
                                  "email":  doctorEmail,
                    	          "access": access[Math.floor(Math.random()*access.length)],
                    	          "group" : "anyone"
                        }
                    };
                    client.post(getAccessUrl, accessArgs, function (data, response) {
                            // parsed response body as js object
                            console.log(data);
                    });
            });
     });

}


