#!/bin/sh

printf "\n\n\n\n**** RUNNING build.sh ********************\n\n"

# Set DTR for Docker - Perform against ALL Dockerfiles in your project
# /usr/bin/perl -i -pe "s|%%DTR_PREFIX%%|$DTR_PREFIX|" Dockerfile || { echo "FATAL: Could not set DTR Prefix"; exit 1; }
# /usr/bin/perl -i -pe "s|%%DTR_ORG%%|$DTR_ORG|" Dockerfile || { echo "FATAL: Could not set DTR Ogranization'"; exit 1; }

# Modifying the image name for PPG Automation 3.0
# sed -i '/image:/s/$/:\${SOURCE_BUILD_NUMBER}/' docker-compose.yml

# Dependency Check
printf "\n\n**** Mandatory: Dependency Checks ********************\n"

npm install || { echo "FATAL: Failed on 'npm install'"; exit 1; } 

# Functional, Integration, Unit and Acceptance Tests
printf "\n\n**** Mandatory: Testing ********************\n"

grunt test || { echo "FATAL: Failed on 'grunt test'"; exit 1; } 

# Build Artifact Production
printf "\n\n**** Optional: Producing Build Artifacts ********************\n"

tar -zcvf $JOB_NAME.BUILD-$BUILD_NUMBER.tar.gz lib node_modules assets fonts images static views app.js package.json run.js gruntfile.js build.sh config.js Dockerfile docker-compose.yml || { echo "FATAL: Failed on 'Artifact tar''"; exit 1; }

printf "\n\n\n\n**** COMPLETED build.sh ********************\n\n"
