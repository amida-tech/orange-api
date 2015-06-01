#!/bin/sh

cat src/api.md src/authentication.md src/user.md src/habits.md src/doctors.md src/pharmacies.md src/medications.md src/adherences.md src/caregivers.md src/dependents.md > tmp.md
aglio -i tmp.md --theme flatly -o output/index.html
rm -f tmp.md
