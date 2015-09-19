#!/bin/bash
# create output & pid dir if not already present
mkdir -p coverage

# run istanbul cover, save it's PID so we can kill it later, and pipe
# it's output into file descriptor 3 so we can wait for the server to start
exec 3< <(NODE_ENV=test ./node_modules/.bin/istanbul cover run.js --dir ./coverage/e2e --handle-sigint & echo $! >coverage/pid)

# wait til we see "Orange API listening at..." to indicate the server's started, then
# kill sed
# run cat to stop istanbul blocking fd 3 (see Stack Overflow #21001220)
sed '/Orange API listening at http:\/\/127.0.0.1:3000$/q' <&3 ; cat <&3 &

# run tests
NODE_ENV=test grunt dropDatabase mochaTest:all dropDatabase

# run unit tests. we handle coverage for unit and e2e test seperately because e2e tests consist
# of chakram making HTTP requests to a seperately running (istanbul-coverered) express server,
# whereas unit tests access app code directly
NODE_ENV=test ./node_modules/.bin/istanbul cover --dir ./coverage/unit grunt dropDatabase mochaTest:unit

# kill istanbul (--handle-sigint) ensures it generates coverage reports here
# kill after running unit tests as some unit tests may make HTTP requests
kill -SIGINT $(<coverage/pid)

# wait for istanbul to be killed (travis is *fast*)
sleep 2

# generate overall report
./node_modules/.bin/istanbul report

# again wait for istanbul to be killed (just in case)
sleep 2
