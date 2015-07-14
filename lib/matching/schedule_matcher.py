import bisect, random, math, dateutil.parser, pytz, datetime, time
from termcolor import colored
from pyevolve import G1DList
from pyevolve import G1DBinaryString
from pyevolve import GSimpleGA
from pyevolve import Selectors
from pyevolve import Initializators, Mutators
from pyevolve import Scaling
from pyevolve import Consts

class ScheduleMatcher(object):
    # scheduled = API-style schedule data object
    # doses = array of times that doses were actually taken at

    def __init__(self, schedule, doses, habits, params):
        # sensible defaults for the habits we need
        if ((not "wake" in habits) or (habits["wake"] == None)): habits["wake"] = "09:00"
        if ((not "tz" in habits) or (habits["tz"] == None)): habits["tz"] = "America/New_York"
        self.habits = habits
        self.tz = pytz.timezone(habits["tz"])

        # parse ISO 8601-formatted dates into Date objects, and sort them
        def parseDose(dose):
            dose["date"] = dateutil.parser.parse(dose["date"]).astimezone(self.tz)
            return dose
        self.doses = map(parseDose, doses)
        self.doses = sorted(self.doses, key = lambda dose: dose["date"])
        # store time's separately for quick access in cost function
        self.doseTimes = map(lambda dose: dose["date"], self.doses)

        # store schedule
        self.schedule = schedule

        # n = number of actual dose events
        self.n = len(doses)
        # m = number of dose events that *should* happen per day
        self.m = len(schedule["times"])

        # if we don't have any doses, we can't match
        if (self.n == 0): return

        # calculate start of first day
        wake = map(int, self.habits["wake"].split(":"))
        self.firstWake = self.doseTimes[0].replace(hour=wake[0], minute=wake[1], second=0, microsecond=0)
        if (self.firstWake > self.doseTimes[0]): self.firstWake -= datetime.timedelta(days=1)

        # calculate total number of days
        self.days = self.dayIndex(self.doseTimes[-1]) + 1

        # a chromosone is an n-element array of integers, where each integer i is:
        #  M representing it doesn't match a scheduled event
        #  i = d*m + k (in 0,1,...,M-1) where d (0,...,days-1) is the day and k
        #    (0,...,m-1 is the index of the scheduled event on that day)
        #    (where M = days * m)
        self.M = self.days * self.m

        genome = G1DList.G1DList(self.n)
        genome.setParams(rangemin=0, rangemax=self.M)
        genome.evaluator.set(self.score)

        # genetic algorithm engine
        self.ga = GSimpleGA.GSimpleGA(genome, interactiveMode=False)
        self.ga.setGenerations(100)
        self.ga.terminationCriteria.set(GSimpleGA.ConvergenceCriteria)

        pop = self.ga.getPopulation()
        pop.scaleMethod.set(Scaling.SigmaTruncScaling)

    def dayIndex(self, dose):
        wake = map(int, self.habits["wake"].split(":"))

        # calculate start of that day
        startDay = dose.replace(hour=wake[0], minute=wake[1], second=0, microsecond=0)
        if (startDay > dose): startDay -= datetime.timedelta(days=1)

        return (startDay - self.firstWake).days

    # score a chromosone
    def score(self, chromosone, debug=False):
        UNMATCHED_DOSE_COST             = 35
        UNMATCHED_SCHEDULE_COST         = 35
        DUPLICATE_COST                  = 50

        TIME_MATCH_COST                 = 0
        if self.schedule["as_needed"]:
            UNSPECIFIED_MATCH_COST      = 5
        else:
            UNSPECIFIED_MATCH_COST      = UNMATCHED_DOSE_COST

        UNSPECIFIED_DAY_DELTA_COST      = 100

        # multiplied by delta ** 5
        DAY_DELTA_COST                  = 50
        # 1 days = 1x
        # 2 days = 32x
        # 3 days = 243x

        MINUTE_DELTA_COST = 0.05
        # 20 minutes = 1.1
        # 1 hour = 3.3
        # 3 hours = 11.2
        # 6 hours = 24
        # 12 hours = 51

        DAY_MONOTONICITY_COST = 7
        TIME_MONOTONICITY_COST = 4

        # store the results of matches to see which are missing
        matchIndices = {};
        for j in range(self.m): matchIndices[j] = []

        # calculate cost then return 1/cost
        costs = []
        costDs = []

        # kernels for deltas of various kinds
        def dayKernel(delta):
            return DAY_DELTA_COST * (delta ** 5)

        def timeKernel(minutes):
            # 'fast' approximate sigmoid function
            # return MINUTE_DELTA_COST * minutes * 1.0/(1 + abs(minutes* 1.0/90))
            return (MINUTE_DELTA_COST * minutes ) ** 1.1

        # add cost and output debugging message
        def addCost(delta, slug, extra):
            costs.append(delta)
            costDs.append((delta, slug, extra))

        # to check monotonicity breakage
        prevEventDay = None
        prevEventTime = None

        # iterate over each number in array (still gray encoded)
        for i in range(self.n):
            addCost(0, "new event", None)
            match = chromosone[i]

            # no match to a scheduled event
            if (match == self.M): addCost(UNMATCHED_DOSE_COST, "unmatched dose", None)

            else:
                # find matched scheduled event
                day, index = divmod(match, self.m)
                event = self.schedule["times"][index]
                # store in matchIndices for aggregate cost
                matchIndices[index].append(day)

                # doses increase monotonically with time, so event days and times should as well
                if (prevEventDay != None and day < prevEventDay):
                    addCost(DAY_MONOTONICITY_COST, "day monotonicity breakage", None)
                prevEventDay = day

                # find actual event
                dose = self.doseTimes[i]
                # check if the same day
                dayDelta = abs(self.dayIndex(dose) - day)
                addCost(dayKernel(dayDelta), "day delta", dayDelta)

                if event["type"] == "unspecified":
                    # heavily penalise cost here
                    if dayDelta > 0:
                        addCost(dayDelta * UNSPECIFIED_DAY_DELTA_COST, "unspecified match day delta cost", dayDelta)

                    # decent match
                    addCost(UNSPECIFIED_MATCH_COST, "unspecified match", None)

                # time match
                else:
                    time = map(int, event["time"].split(":"))
                    date = dose.replace(hour=time[0], minute=time[1], second=0, microsecond=0)
                    # number of days that need to be added
                    day_delta = day - self.dayIndex(date)
                    date += datetime.timedelta(day_delta)


                    if (prevEventTime != None and date < prevEventTime):
                        addCost(TIME_MONOTONICITY_COST, "time monotonicity breakage", None)
                    prevEventTime = date

                    # in minutes
                    delta = abs((date - dose).total_seconds()/60.0)
                    addCost(TIME_MATCH_COST, "time match", None)
                    addCost(timeKernel(delta), "time kernel", delta)

        for j in range(self.m):
            indices = matchIndices[j]
            num_duplicates = len(indices) - len(set(indices))
            addCost(num_duplicates * DUPLICATE_COST, "duplicates", num_duplicates)

            # ideally would have self.days worth in each one
            num_missed = abs(len(set(indices)) - self.days)
            addCost(num_missed * UNMATCHED_SCHEDULE_COST, "unmatched schedules", num_missed)

        if debug: return costDs

        return 100.0/sum(costs)


    def match(self, debug=False):
        # if we don't have any doses, we can't match
        if (self.n == 0): return { "matches": [], "start": None }

        chromosone = self.ga.evolve()
        datums = []

        costs = self.score(chromosone, debug=debug)
        costIndex = 0
        for i in range(self.n):
            match = chromosone[i]

            # data to return over zeromq
            datum = {
                "dose": self.doses[i]["_id"]
            }
            if (match == self.M): datum["match"] = None
            else:
                day, index = divmod(match, self.m)
                event = self.schedule["times"][index]
                datum["match"] = {
                    "day": day,
                    "index": index
                }
            datums.append(datum)

            # find actual event
            if debug:
                # find actual event
                dose = self.doseTimes[i]

                print colored("Actual   : day %d time %s" % (self.dayIndex(dose), dose.astimezone(self.tz).strftime("%H:%M")), "blue")

                if (match == self.M):
                    print colored("Scheduled: -- unmatched --", "blue")
                else:
                    # find matched scheduled event
                    day, index = divmod(match, self.m)
                    event = self.schedule["times"][index]

                    if (event["type"] == "unspecified"):
                        print colored("Scheduled: day %d time --" % day, "blue")
                    else:
                        print colored("Scheduled: day %d time %s" % (day, event["time"]), "blue")

                while True:
                    cost = costs[costIndex]
                    color = "green"
                    if (cost[0] > 20): color = "red"
                    extra = ""
                    if (cost[2] != None): extra = " %8.3f" % cost[2]
                    print colored("%-35s" % cost[1], "yellow") + colored("%8.3f" % cost[0], color) + extra

                    costIndex += 1
                    if costIndex == len(costs) or costs[costIndex][1] == "new event": break
                print

                print datum

        return { "matches": datums, "start": self.firstWake.isoformat() }
