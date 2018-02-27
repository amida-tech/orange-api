from locust import HttpLocust, TaskSet, task
from faker import Faker
import arrow
import time


class UserBehavior(TaskSet):
    def on_start(self):
        self.access_token = ''
        self.patientIDS = []
        self.patient_id = ''
        self.med_id = ''
        self.userName = ''
        self.count = 0
        self.startTime = int(time.time())
        self.registerUser()
        self.getAuthToken()
        for x in range(0, 10):
            self.createPatient()
        self.getPatientIds()

    def registerUser(self):
        fake = Faker()
        self.name = fake.name().split(' ')

        self.firstName = self.name[0]
        self.lastName = self.name[1]
        # include count in username to avoid duplicate usernames at scale
        # include timestamp to allow multiple runs without clearing db
        self.userName = self.firstName[0] + self.lastName + str(self.count) + str(self.startTime) + "@amida-demo.com"
        self.count += 1
        response = self.client.request(
            method="POST",
            url="/user/",
            headers={
                "X-Client-Secret": 'testsecret',
                "Content-Type": 'application/json'
            },
            json={
                "email": self.userName,
                "password": "testtest",
                "first_name": self.firstName,
                "last_name": self.lastName
            },
            name="/user/")

    def createPatient(self):
        fake = Faker()
        self.name = fake.name().split(' ')

        self.firstName = self.name[0]
        self.lastName = self.name[1]
        response = self.client.request(
            method="POST",
            url="/patients",
            headers={
                "Authorization": self.access_token,
                "X-Client-Secret": 'testsecret'
            },
            json={
                "first_name": self.firstName,
                "last_name": self.lastName,
                "birthdate": "1990-01-01",
                "sex": "female",
                "phone": fake.phone_number() ,
                "access_anyone": "read",
                "access_family": "read",
                "access_prime": "write"
            },
            name="/patients")

    def getPatientIds(self):
        response = self.client.request(
            method="GET",
            url="/patients",
            headers={
                "Authorization": self.access_token,
                "X-Client-Secret": 'testsecret'
            },
            name="/patients")
        self.patientIDS = response.json()["patients"]
        self.patient_id = str(self.patientIDS[0]["id"])

    @task()
    def getAuthToken(self):
        self.access_token = 'Bearer '
        response = self.client.request(
            method="POST",
            url="/auth/token",
            headers={
                "X-Client-Secret": 'testsecret',
                "Content-Type": 'application/json'
            },
            json={"email": self.userName,
                  "password": "testtest"},
            name="/auth/token")
        json = response.json()
        self.access_token = self.access_token + json['access_token']

    def addMedication(self):
        response = self.client.request(
            method="POST",
            url="/patients/" + self.patient_id + "/medications",
            headers={
                "Authorization": self.access_token,
                "X-Client-Secret": 'testsecret',
                "Content-Type": 'application/json'
            },
            json={
                "patientid": 41,
                "name": "Clindamycin",
                "brand": "Cleocin",
                "dose": {
                    "quantity": 150,
                    "unit": "mg"
                },
                "route": "oral",
                "form": "pill",
                "schedule": {
                    "as_needed":
                    False,
                    "regularly":
                    True,
                    "until": {
                        "type": "number",
                        "stop": 40
                    },
                    "frequency": {
                        "n": 1,
                        "unit": "day"
                    },
                    "times": [{
                        "type": "exact",
                        "time": "01:00"
                    }, {
                        "type": "exact",
                        "time": "07:00"
                    }, {
                        "type": "exact",
                        "time": "13:00"
                    }, {
                        "type": "exact",
                        "time": "19:00"
                    }],
                    "take_with_food":
                    None,
                    "take_with_medications": [],
                    "take_without_medications": []
                }
            },
            name="/patients/:id/medications")
        json = response.json()
        self.med_id = json["id"]

    @task()
    def addDoctor(self):
        response = self.client.request(
            method="POST",
            url="/patients/" + self.patient_id + "/doctors",
            headers={
                "Authorization": self.access_token,
                "X-Client-Secret": 'testsecret',
                "Content-Type": 'application/json'
            },
            json={
                "name": "Dr. Drew",
                "phone": "(240) 654-1289",
                "address": "Doctor Street, DC, 20052",
                "notes": "Love this doc!",
                "title": "Primary Care Physician"
            },
            name="/patients/:id/doctors")

    @task()
    def addPharmacy(self):
        response = self.client.request(
            method="POST",
            url="/patients/" + self.patient_id + "/pharmacies",
            headers={
                "Authorization": self.access_token,
                "X-Client-Secret": 'testsecret',
                "Content-Type": 'application/json'
            },
            json={
                "name": "Pharmacy X",
                "address": "Pharmacy Street, DC, 20052",
                "phone": "(617) 617-6177",
                "hours": {
                    "monday": {
                        "open": "09:00 am",
                        "close": "05:00 pm"
                    },
                    "tuesday": {
                        "open": "09:00 am",
                        "close": "05:00 pm"
                    },
                    "wednesday": {
                        "open": "09:00 am",
                        "close": "05:00 pm"
                    },
                    "thursday": {
                        "open": "09:00 am",
                        "close": "05:00 pm"
                    },
                    "friday": {
                        "open": "09:00 am",
                        "close": "05:00 pm"
                    },
                    "saturday": {
                        "open": "09:00 am",
                        "close": "05:00 pm"
                    },
                    "sunday": {
                        "open": "09:00 am",
                        "close": "05:00 pm"
                    }
                },
                "notes": "Great pharmacy! Love the smell"
            },
            name="/patients/:id/pharmacies")

    def addDose(self):
        response = self.client.request(
            method="POST",
            url="/patients/" + self.patient_id + "/doses",
            headers={
                "Authorization": self.access_token,
                "X-Client-Secret": 'testsecret',
                "Content-Type": 'application/json'
            },
            json={
                "medication_id": self.med_id,
                "date": arrow.utcnow().isoformat(),
                "taken": True,
                "scheduled": 1
            },
            name="/patients/:id/doses")

    @task()
    def addMedicationDose(self):
        self.addMedication()
        self.addDose()

    @task()
    def addJournalEntry(self):
        response = self.client.request(
            method="POST",
            url="/patients/" + self.patient_id + "/journal",
            headers={
                "Authorization": self.access_token,
                "X-Client-Secret": 'testsecret',
                "Content-Type": 'application/json'
            },
            json={
                "date":
                arrow.utcnow().isoformat(),
                "text":
                "Feeling grumpy and irritable this morning will report to physician",
                "mood":
                "bad"
            },
            name="/patients/:id/journal")


class WebsiteUser(HttpLocust):
    task_set = UserBehavior
    min_wait = 5000
    max_wait = 9000
