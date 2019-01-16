### System Requirements
-jq

### Sample run command for docker container:
```
docker run \
-e AUTH_MICROSERVICE_URL=http://localhost:4000/auth/api/v2 \
-e ORANGE_API_URL=http://localhost:5000/v1 \
-e X_CLIENT_SECRET=testsecret \
-e ORANGE_DEMO_PATIENTS='[ { "email": "patient1@amida.com", "password": "Testpassword3" }, { "email": "patient2@amida.com", "password": "Testpassword2" } ]' \
demo-data-generator:01 
```

### Sample run line for bash:
```
AUTH_MICROSERVICE_URL=http://localhost:4000/auth/api/v2 \
ORANGE_API_URL=http://localhost:5000/v1 \
X_CLIENT_SECRET=testsecret \
ORANGE_DEMO_PATIENTS='[ { "email": "patient1@amida.com", "password": "Testpassword3" }, { "email": "patient2@amida.com", "password": "Testpassword2" } ]' \
./create-demo-data.sh
```
