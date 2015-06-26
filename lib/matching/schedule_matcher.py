import bisect, random, math

class ScheduleMatcher(object):
    # scheduled = array of numbers representing the times of scheduled doses
    # doses = array of numbers representing the times doses were actually taken
    # params:
        # population_size: number of states to initialise
        # alpha: weighting of # of unmatched schedule events in cost function
        # beta: weighting of # of unmatched dose events in cost function
        # gamma: weighting of time delta between schedule and dose events in cost function
        # iota: weighting to give duplicates (one dose matched to two schedule events) in
        #       cost function
        # eta: weighting to give monotonicity breakers (schedule events who are matched up
        #       with a dose event that tooks place before the dose event the previous
        #       schedule matches) in the cost function
        # chi: proportion of population who should breed offspring for the next generation
        #      rather than being copied across
        # mu: proportion of population who should be randomly mutated in each evolve step
        # max_iterations: maximum number of iterations to run before returning the best match
        #                 so far
        # kappa: scaling constant used in kernel function on time delta between scheduled and
        #        dose events. when delta = kappa, kernel(radius) = 1/2 (kernel is a standard
        #        fast sigmoid)
        # fitness_threshold: if the fitness of a state is greater than this, stop evolving and
        #                    just use that state
        # 

    def __init__(self, scheduled, doses, params):
        # we assume these are sorted in e.g., cost generation
        self.scheduled = sorted(scheduled)
        self.doses = sorted(doses)

        # store parameters with sensible defaults
        # TODO: these are probably pretty terrible defaults, CV some better ones!
        self.population_size = 1000
        if "population_size" in params: self.population_size = params["population_size"]
        self.alpha = 3
        if "alpha" in params: self.alpha = params["alpha"]
        self.beta = 2
        if "beta" in params: self.beta = params["beta"]
        self.gamma = 1
        if "gamma" in params: self.gamma = params["gamma"]
        self.chi = 0.8
        if "chi" in params: self.chi = params["chi"]
        self.mu = 0.1
        if "mu" in params: self.mu = params["mu"]
        self.max_iterations = 1000
        if "max_iterations" in params: self.max_iterations = params["max_iterations"]
        self.iota = 5
        if "iota" in params: self.iota = params["iota"]
        self.kappa = 2
        if "kappa" in params: self.kappa = params["kappa"]
        self.eta = 5
        if "eta" in params: self.eta = params["eta"]
        self.fitness_threshold = 0.10
        if "fitness_threshold" in params: self.fitness_threshold = params["fitness_threshold"]

        # m = number of schedule events
        self.m = len(self.scheduled)
        # n = number of dose events
        self.n = len(self.doses)

        # each state is then array of m numbers, with each number representing
        # the match of a dose event for a schedule event
        #   n indicates no dose was matched to that schedule event
        #   j indicates the jth dose was matched to that schedule event
        #      (0 indexed)
        # we want to perform low-level manipulation of these states for the genetic
        # algorithm, so we represent them as bitstrings of length m*ceil(log2(n))
        self.chunk_length = int(math.ceil(math.log(self.n, 2)))
        # mask to get the chunk_length LSBs from a bitstring
        self.chunk_mask = (2**self.chunk_length - 1)
        self.M = self.m * self.chunk_length
        # of course some bitstrings will not correspond to valid states, so we assign
        # those a fitness of 0 (if they have a 'chunk' value > n)
        # in turn, we represent these bitstrings as ints within python

        # initialise population with random bitstrings
        self.population = [random.randint(0, 2**self.M-1) for i in range(self.population_size)]
        # evaluate fitness of that population
        self.evaluate()

    # calculate fitness for the whole population
    def evaluate(self):
        self.costs = map(self.cost, self.population)
        self.fitnesses = map(self.fitness, self.costs)

        # turn the fitnesses into a cumulative probability distribution so we can select
        # members weighted by fitness (roulette wheel selection)
        sum_fitnesses = sum(self.fitnesses)
        probabilities = map(lambda f: f/sum_fitnesses, self.fitnesses)

        self.cumulative = []
        self.total = 0
        for probability in probabilities:
            self.total += probability
            self.cumulative.append(self.total)

    # randomly select, weighted by fitness (roulette wheel), k members of the current
    # population
    def select(self, k):
        # bisect with a random variable to pick a state weighted by the original
        # probabilities
        return [self.population[bisect.bisect(self.cumulative, random.random() * self.total)] for i in range(k)]

    # fitness = 1/cost or 0 if cost == -1
    def fitness(self, cost):
        if cost == -1: return 0
        else: return 1.0/cost

    # returns highest fitness (from a precalculated self.fitnesses)
    # and its corresponding state
    def best(self):
        return max(enumerate(self.fitnesses), key = lambda d: d[1])

    # matches are scored with a cost function
    def cost(self, state):
        unmatched_schedules = 0
        matched_doses = []
        radii = []
        duplicates = 0
        monotonicity_breakers = 0

        # we chunk state into m chunk_length-bit chunks
        for i in range(self.m):
            # want to get bits from i*chunk_length to (i+1)*chunk_length-1
            match = (state >> (i*self.chunk_length)) & self.chunk_mask;

            # invalid match bitstring (randomly initialised to an invalid bitstring,
            # but we assign it a fitness of 0)
            if match > self.n: return -1

            # no match for this schedule event
            elif match == self.n: unmatched_schedules += 1

            # a match that we can calculate distance for
            else:
                # HEAVY duplicate penalty
                if (match in matched_doses): duplicates += 1

                # penalty for breaking monotonicity
                if (len(matched_doses) != 0 and match < matched_doses[0]): monotonicity_breakers += 1

                matched_doses.append(match)
                radii.append(abs(self.scheduled[i] - self.doses[match]))

        # count unmatched doses
        unmatched_doses = self.n - len(set(matched_doses))

        # weighted total
        return self.alpha * unmatched_schedules + \
            self.beta * unmatched_doses + \
            self.gamma * sum(map(self.kernel, radii)) + \
            self.iota * duplicates + \
            self.eta * monotonicity_breakers

    # 'fast' approximate sigmoid function
    def kernel(self, val):
        return val*1.0/(1+abs(val*1.0/self.kappa))

    # crossover two parents to produce two offspring (one-point crossover)
    def crossover(self, parent1, parent2):
        # simple one-point crossover with random index
        index = random.randint(1, self.M-1)
        # following algorithm from Tai
        mask1 = 2**self.M - 2**index
        mask2 = 2**index - 1
        offspring1 = (parent1 & mask1) | (parent2 & mask2)
        offspring2 = (parent1 & mask2) | (parent2 & mask1)
        return (offspring1, offspring2)

    # randomly flip a bit in a state
    def mutate(self, state):
        point = random.randint(0, self.M-1)
        mask = 2**point
        return state ^ mask

    # evolve into a new population (standard genetic algorithm)
    def evolve(self):
        # initial step to populate new generation
        # select and copy (1-chi)*N members straight into the new generation
        # select chi*N members, cross them over, and insert their (2) offspring into the new generation
        number_parents = 2*int(math.floor(0.5*self.chi*self.population_size)) # must be even
        number_copies = self.population_size - number_parents

        # initialise new population with copies
        population = self.select(number_copies)

        # select parents and pair them up
        males = self.select(number_parents/2)
        females = self.select(number_parents/2)
        for i in range(number_parents/2):
            # crossover the two parents
            offspring1, offspring2 = self.crossover(males[i], females[i])
            population.append(offspring1)
            population.append(offspring2)

        # randomly mutate mu*N members of the new population
        for i in range(int(math.floor(self.mu*self.population_size))):
            index = random.randint(0, self.population_size - 1)
            population[index] = self.mutate(population[index])

        # store population and evaluate fitness
        self.population = population
        self.evaluate()

    # evolve the population til a good enough match is found and return it
    # note that this is blocking and synchronous
    def match(self):
        for iteration in range(self.max_iterations):
            self.evolve()
            # check if new generation meets the threshold
            index, fitness = self.best()
            if fitness > self.fitness_threshold:
                # stop evolving
                break

        # whether we've reached the max number of iterations or the population
        # is 'good enough' (fitness > threshold), we return the best state here anyway
        result = {
            "fitness": fitness,
            "match": []
        }

        # format state for output
        state = self.population[index]
        # we chunk state into m chunk_length-bit chunks
        for i in range(self.m):
            # want to get bits from i*chunk_length to (i+1)*chunk_length-1
            match = (state >> (i*self.chunk_length)) & self.chunk_mask;
            # no match
            if (match == self.n):
                result["match"].append({
                    "scheduled": i,
                    "match": False
                })
            else:
                result["match"].append({
                    "scheduled": i,
                    "match": True,
                    "dose": match
                })
        return result

# sm = ScheduleMatcher([5, 7, 15, 17, 25, 27, 35, 37], [8, 9, 12, 16, 28, 34, 36], {})
# print sm.match()
