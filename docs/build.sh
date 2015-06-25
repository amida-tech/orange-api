#!/bin/bash

# should be run from in docs/ dir
# i.e., ./build.sh

# we're using a shell script becuase the latest versions of aglio
# don't play too well with grunt-aglio

pushd src/
mkdir -p ../output
# Filter out lines with "not specified" from stderr
# Because of limitations (as of writing) in aglio's parsing of API blueprints,
# we're technically not following spec and using Parameters to specify data to POST.
# This produces a bunch of "parameter x not specified" errors we don't particularly
# care about as they just kill the snr ratio
../../node_modules/.bin/aglio -i docs.md --theme flatly -o ../output/index.html 2>&1 | grep -v "not specified"
popd
