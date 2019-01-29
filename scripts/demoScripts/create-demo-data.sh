#!/bin/bash

echo 'Generating demo data...';

for i in `seq 0 9`; do
  PATIENT_EMAIL=$(echo $ORANGE_DEMO_PATIENTS | jq ".[$i].email")
  PATIENT_PASSWORD=$(echo $ORANGE_DEMO_PATIENTS | jq ".[$i].password")
  echo "Calling APIs with email $PATIENT_EMAIL";
  node ./reportsMockScript.js $AUTH_MICROSERVICE_URL $ORANGE_API_URL $X_CLIENT_SECRET $PATIENT_EMAIL $PATIENT_PASSWORD;
done

echo 'Done generating demo data.';
