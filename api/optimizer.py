from ortools.sat.python import cp_model
import simpy

def solve_dispatch(trains):
    """
    Solves the single-track dispatch scheduling problem using OR-Tools CP-SAT.
    Trains input format: [{"id": "Freight", "priority": 3, "travel_time": 25}, ...]
    """
    model = cp_model.CpModel()
    
    intervals = []
    starts = {}
    ends = {}
    
    # Max possible time is if everyone goes sequentially with a buffer
    horizon = sum(t["travel_time"] for t in trains) + 10
    
    for t in trains:
        tid = t["id"]
        start_var = model.NewIntVar(0, horizon, f"start_{tid}")
        end_var = model.NewIntVar(0, horizon, f"end_{tid}")
        interval_var = model.NewIntervalVar(start_var, t["travel_time"], end_var, f"interval_{tid}")
        
        starts[tid] = start_var
        ends[tid] = end_var
        intervals.append(interval_var)
        
    # Constraint: single track, no passing/overlap allowed
    model.AddNoOverlap(intervals)
    
    # Objective: Minimize weighted wait time
    # Priority 1 (Express) gets a heavy penalty for waiting (weight=100)
    # Priority 3 (Freight) gets a light penalty (weight=33)
    obj_terms = []
    for t in trains:
        weight = 100 // t["priority"]
        obj_terms.append(starts[t["id"]] * weight)
        
    model.Minimize(sum(obj_terms))
    
    solver = cp_model.CpSolver()
    status = solver.Solve(model)
    
    if status == cp_model.OPTIMAL or status == cp_model.FEASIBLE:
        schedule = []
        for t in trains:
            schedule.append({
                "id": t["id"],
                "start": solver.Value(starts[t["id"]]),
                "end": solver.Value(ends[t["id"]]),
                "priority": t["priority"],
                "travel_time": t["travel_time"]
            })
        schedule.sort(key=lambda x: x["start"])
        return schedule
    return []

def run_simulation(schedule):
    """
    Runs a SimPy discrete-event simulation of the provided schedule to verify 
    the timetable and generate a chronological event log.
    """
    env = simpy.Environment()
    track = simpy.Resource(env, capacity=1)
    logs = []

    def log(msg):
        # Format time relative to start (T+00, T+15, etc.)
        time_str = f"T+{int(env.now):02d}"
        logs.append({"time": time_str, "msg": msg})

    def train_process(env, name, schedule_start, travel_time, prio):
        # The train "wants" to depart at T=0, but OR-Tools scheduled it for `schedule_start`
        yield env.timeout(schedule_start)
        prio_label = f"Priority {prio}"
        
        log(f"{name} ({prio_label}) requesting clearance for single-track section.")
        with track.request() as req:
            yield req
            log(f"{name} granted clearance. Entering single-track.")
            yield env.timeout(travel_time)
            log(f"{name} cleared the single-track section.")

    for s in schedule:
        env.process(train_process(env, s["id"], s["start"], s["travel_time"], s["priority"]))

    env.run()
    return logs

def solve_fifo(trains):
    """
    Simulates a manual/FIFO dispatch where trains are dispatched in the exact 
    order they arrived (the array order).
    """
    schedule = []
    current_time = 0
    for t in trains:
        schedule.append({
            "id": t["id"],
            "start": current_time,
            "end": current_time + t["travel_time"],
            "priority": t["priority"],
            "travel_time": t["travel_time"]
        })
        current_time += t["travel_time"]
    return schedule

def calculate_cost(schedule):
    """
    Calculates the priority-weighted wait time for a given schedule.
    """
    cost = 0
    for s in schedule:
        weight = 100 // s["priority"]
        cost += s["start"] * weight
    return cost
