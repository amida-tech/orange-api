#!/bin/bash
# create output & pid dir if not already present
mkdir -p coverage

# run istanbul cover, save it's PID so we can kill it later, and pipe
# it's output into file descriptor 3 so we can wait for the server to start
exec 3< <(./node_modules/.bin/istanbul cover run.js --dir ./coverage/e2e --handle-sigint & echo $! >coverage/pid)

# wait til we see "Orange API listening at..." to indicate the server's started, then
# kill sed
# run cat to stop istanbul blocking fd 3 (see Stack Overflow #21001220)
sed '/Orange API listening at http:\/\/0.0.0.0:3000$/q' <&3 ; cat <&3 &

# run tests
grunt dropDatabase mochaTest:all dropDatabase

# kill istanbul (--handle-sigint) ensures it generates coverage reports here
kill -SIGINT $(<coverage/pid)

# run unit tests. we handle coverage for unit and e2e test seperately because e2e tests consist
# of chakram making HTTP requests to a seperately running (istanbul-coverered) express server,
# whereas unit tests access app code directly
./node_modules/.bin/istanbul cover --dir ./coverage/unit grunt dropDatabase mochaTest:unit

# wait for istanbul to be killed (travis is *fast*)
sleep 2

# generate overall report
./node_modules/.bin/istanbul report

# again wait for istanbul to be killed (just in case)
sleep 2
