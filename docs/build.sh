#!/bin/sh

# should be run from in docs/ dir
# i.e., ./build.sh

pushd src/
aglio -i docs.md --theme flatly -o ../output/index.html
popd
