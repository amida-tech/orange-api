#!/usr/bin/env python
import zerorpc, sys, time
from daemon import Daemon
from schedule_matcher import ScheduleMatcher

# simple ZeroMQ server to pass things into ScheduleMatcher
class MatcherRPC(object):
    def match(self, scheduled, doses, habits, params):
        sm = ScheduleMatcher(scheduled, doses, habits, params)
        return sm.match(debug=False)

# daemonize MatcherRPC
class MatcherDaemon(Daemon):
    def run(self):
        s = zerorpc.Server(MatcherRPC())
        s.bind("tcp://127.0.0.1:4242")
        s.run()

if __name__ == "__main__":
    daemon = MatcherDaemon('/tmp/matcher-daemon.pid', stdout='/tmp/matcher-daemon.log')

    if len(sys.argv) == 2:
        if 'start' == sys.argv[1]: daemon.start()
        elif 'stop' == sys.argv[1]: daemon.stop()
        elif 'restart' == sys.argv[1]: daemon.restart()
        elif 'run' == sys.argv[1]: daemon.run()
        else:
            print "Unknown command"
            sys.exit(2)
        sys.exit(0)
    else:
        print "usage: %s start|stop|restart|run" % sys.argv[0]
        sys.exit(2)
