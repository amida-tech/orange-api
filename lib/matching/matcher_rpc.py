#!/usr/bin/python
import zerorpc, sys, time
from daemon import Daemon
from schedule_matcher import ScheduleMatcher

# simple ZeroMQ server to pass things into ScheduleMatcher
class MatcherRPC(object):
    def match(self, scheduled, doses, params):
        sm = ScheduleMatcher(scheduled, doses, params)
        return sm.match()

# daemonize MatcherRPC
class MatcherDaemon(Daemon):
    def run(self):
        s = zerorpc.Server(MatcherRPC())
        s.bind("tcp://0.0.0.0:4242")
        s.run()

if __name__ == "__main__":
    daemon = MatcherDaemon('/tmp/matcher-daemon.pid')
    if len(sys.argv) == 2:
        if 'start' == sys.argv[1]: daemon.start()
        elif 'stop' == sys.argv[1]: daemon.stop()
        elif 'restart' == sys.argv[1]: daemon.restart()
        else:
            print "Unknown command"
            sys.exit(2)
        sys.exit(0)
    else:
        print "usage: %s start|stop|restart" % sys.argv[0]
        sys.exit(2)
