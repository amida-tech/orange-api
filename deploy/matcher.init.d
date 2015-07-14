#!/bin/sh -e
# chkconfig: 345 99 01
# description: orange API matcher

DAEMON="/var/www/orange/current/lib/matching/matcher_rpc.py"
DAEMONUSER="vagrant"
DEAMON_NAME="orange-matcher"

PATH="/sbin:/bin:/usr/sbin:/usr/bin"

test -x $DAEMON || exit 0

start () {
        echo "Starting system $DEAMON_NAME Daemon"
	su - $DAEMONUSER -c "$DAEMON start"
}

stop () {
        echo "Stopping system $DEAMON_NAME Daemon"
	su - $DAEMONUSER -c "$DAEMON stop"
}

case "$1" in

        start|stop)
                ${1}
                ;;

        restart)
                        d_stop
                        start
                ;;

        *)
                echo "Usage: /etc/init.d/$DEAMON_NAME {start|stop|restart}"
                exit 1
                ;;
esac
exit 0
