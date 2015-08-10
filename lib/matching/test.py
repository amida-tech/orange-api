#!/usr/bin/env python
import pickle
from schedule_matcher import ScheduleMatcher

# run matcher from data dump pickled into /tmp/input
data = pickle.load(open("/tmp/input", "rb"))
sm = ScheduleMatcher(data["schedule"], data["doses"], data["habits"], {})
print sm.match(debug=False)
