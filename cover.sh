#!/bin/bash
# create output & pid dir if not already present
mkdir -p coverage

# run istanbul cover, save it's PID so we can kill it later, and pipe
# it's output into file descriptor 3 so we can wait for the server to start
exec 3< <(./node_modules/.bin/istanbul cover run.js --dir ./coverage --handle-sigint & echo $! >coverage/pid)

# wait til we see "Orange API listening at..." to indicate the server's started, then
# kill sed
# run cat to stop istanbul blocking fd 3 (see Stack Overflow #21001220)
sed '/Orange API listening at http:\/\/0.0.0.0:3000$/q' <&3 ; cat <&3 &

# runt tests
grunt dropDatabase mochaTest dropDatabase

# kill istanbul (--handle-sigint) ensures it generates coverage reports here
kill -SIGINT $(<coverage/pid)

# wait for istanbul (proceeding grunt tasks may fail otherwise)
sleep 2
