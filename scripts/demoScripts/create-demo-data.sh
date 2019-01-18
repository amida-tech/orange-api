#!/bin/bash

echo 'ORANGE_DEMO_PATIENTS is:';
echo $ORANGE_DEMO_PATIENTS;

echo 'looping...';
for i in `seq 0 9`; do
  PATIENT_EMAIL=$(echo $ORANGE_DEMO_PATIENTS | jq ".[$i].email")
  PATIENT_PASSWORD=$(echo $ORANGE_DEMO_PATIENTS | jq ".[$i].password")
  echo "Making API call with email $PATIENT_EMAIL and password $PATIENT_PASSWORD";
  node ./reportsMockScript.js $AUTH_MICROSERVICE_URL $ORANGE_API_URL $X_CLIENT_SECRET $PATIENT_EMAIL $PATIENT_PASSWORD;
  echo "Done with loop $i";
done

