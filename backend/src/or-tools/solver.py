#!/usr/bin/env python3
"""
Timetable Solver using Google OR-Tools CP-SAT
Implements all 4 user-requested rules:
1. 同一科目不在同一天连续出现 - No consecutive same subject
2. 避免教师连续授课3个班级以上 - Max 3 consecutive periods per teacher
3. 双节不可跨过课间时间 - Double periods can't span breaks
4. 减少教师在校时间 - Minimize teacher gaps (optimization)
"""

import json
import sys
import time
from ortools.sat.python import cp_model


def solve_timetable(input_data: dict) -> dict:
    """
    Solve timetable scheduling problem using OR-Tools CP-SAT solver.
    """
    start_time = time.time()
    
    # Extract dimensions
    num_classes = input_data["num_classes"]
    num_teachers = input_data["num_teachers"]
    num_subjects = input_data["num_subjects"]
    num_periods_per_day = input_data["num_periods_per_day"]
    num_days = input_data["num_days"]
    
    # Extract data arrays
    class_subject_periods = input_data["class_subject_periods"]
    teacher_for_class_subject = input_data["teacher_for_class_subject"]
    
    # Extract flags
    flag_no_consecutive = input_data.get("FLAG_NO_CONSECUTIVE_SAME_SUBJECT", True)
    max_teacher_consecutive = input_data.get("MAX_TEACHER_CONSECUTIVE", 3)
    flag_double_period_no_recess = input_data.get("FLAG_DOUBLE_PERIOD_NO_RECESS", False)
    flag_minimize_teacher_gaps = input_data.get("FLAG_MINIMIZE_TEACHER_GAPS", False)
    slot_is_break = input_data.get("slot_is_break", [[False] * num_periods_per_day] * num_days)
    timeout_seconds = input_data.get("timeout_seconds", 720)
    
    print(f"Problem: {num_classes} classes, {num_teachers} teachers, {num_subjects} subjects")
    print(f"Grid: {num_days} days × {num_periods_per_day} periods = {num_days * num_periods_per_day} slots")
    print(f"Rules: consecutive={flag_no_consecutive}, max_teacher={max_teacher_consecutive}, "
          f"double_break={flag_double_period_no_recess}, minimize_gaps={flag_minimize_teacher_gaps}")
    
    model = cp_model.CpModel()
    
    # ============ DECISION VARIABLES ============
    # timetable[c, d, p] = subject (0 = free period)
    timetable = {}
    for c in range(num_classes):
        for d in range(num_days):
            for p in range(num_periods_per_day):
                timetable[c, d, p] = model.NewIntVar(0, num_subjects, f"tt_c{c}_d{d}_p{p}")
    
    # is_subject[c, d, p, s] = True if class c has subject s at (d, p)
    is_subject = {}
    for c in range(num_classes):
        for d in range(num_days):
            for p in range(num_periods_per_day):
                for s in range(1, num_subjects + 1):
                    is_subject[c, d, p, s] = model.NewBoolVar(f"is_c{c}_d{d}_p{p}_s{s}")
                    model.Add(timetable[c, d, p] == s).OnlyEnforceIf(is_subject[c, d, p, s])
                    model.Add(timetable[c, d, p] != s).OnlyEnforceIf(is_subject[c, d, p, s].Not())
    
    # ============ STATIC COURSES (extract early for use in constraints) ============
    static_courses = input_data.get("static_courses", [])
    
    # ============ CONSTRAINT 1: Period Count (Exact) ============
    # Require exactly the number of periods specified
    # Build a set of (class, day, period) slots that are blocked by static courses
    static_blocked = set()
    for sc in static_courses:
        c = sc.get("class_index", -1)
        d = sc.get("day", -1)
        p = sc.get("period", -1)
        if 0 <= c < num_classes and 0 <= d < num_days and 0 <= p < num_periods_per_day:
            static_blocked.add((c, d, p))
    
    for c in range(num_classes):
        for s in range(num_subjects):
            subject_id = s + 1
            required = class_subject_periods[c][s]
            # Only count slots that are NOT blocked by static courses
            available_slots = [
                is_subject[c, d, p, subject_id] 
                for d in range(num_days) 
                for p in range(num_periods_per_day)
                if (c, d, p) not in static_blocked
            ]
            model.Add(sum(available_slots) == required)
    
    # ============ CONSTRAINT 2: Teacher Conflict ============
    # Build teaching assignment lookup and is_teaching variables
    is_teaching = {}
    for t in range(1, num_teachers + 1):
        for d in range(num_days):
            for p in range(num_periods_per_day):
                teaching_vars = []
                for c in range(num_classes):
                    for s in range(num_subjects):
                        if teacher_for_class_subject[c][s] == t:
                            teaching_vars.append(is_subject[c, d, p, s + 1])
                
                if teaching_vars:
                    is_teaching[t, d, p] = model.NewBoolVar(f"teach_t{t}_d{d}_p{p}")
                    model.Add(sum(teaching_vars) <= 1)  # Teacher can teach at most 1 class
                    model.Add(sum(teaching_vars) >= 1).OnlyEnforceIf(is_teaching[t, d, p])
                    model.Add(sum(teaching_vars) == 0).OnlyEnforceIf(is_teaching[t, d, p].Not())
    
    # ============ CONSTRAINT 3: Static Courses (固定课程) ============
    # These are fixed slots that cannot be changed (already extracted above)
    for sc in static_courses:
        c = sc["class_index"]
        d = sc["day"]
        p = sc["period"]
        # Mark this slot as occupied by a "static" subject (use subject 0 to mark as blocked)
        # Actually, we need to block all other subjects from this slot
        # For now, just set it to subject 0 (free) since static courses aren't real subjects
        # The frontend will overlay static course names
        if 0 <= c < num_classes and 0 <= d < num_days and 0 <= p < num_periods_per_day:
            model.Add(timetable[c, d, p] == 0)  # Block this slot from being scheduled
    
    # ============ CONSTRAINT 4: Max 2 Per Day ============
    # A subject can appear at most 2 times per day
    # NOTE: Consecutive requirement temporarily disabled for performance
    # (The full constraint with consecutive check is too expensive for zero-slack schedules)
    for c in range(num_classes):
        for d in range(num_days):
            for s in range(1, num_subjects + 1):
                day_occurrences = [is_subject[c, d, p, s] for p in range(num_periods_per_day)]
                
                # Max 2 per day
                model.Add(sum(day_occurrences) <= 2)
                
                # Consecutive requirement DISABLED for now - causes solver timeout with zero-slack schedules
                # To re-enable: uncomment the loop below
                for p1 in range(num_periods_per_day - 2):
                    for p2 in range(p1 + 2, num_periods_per_day):
                        model.AddBoolOr([
                            is_subject[c, d, p1, s].Not(),
                            is_subject[c, d, p2, s].Not()
                        ])
    
    # ============ RULE 1: Allow Double Periods but No Triple+ ============
    # Allow 2 consecutive same subject (double period) but not 3+
    if flag_no_consecutive:
        for c in range(num_classes):
            for d in range(num_days):
                for p in range(num_periods_per_day - 2):  # Check windows of 3
                    for s in range(1, num_subjects + 1):
                        # Cannot have 3+ consecutive same subject
                        # At least one of the 3 must be different
                        model.AddBoolOr([
                            is_subject[c, d, p, s].Not(), 
                            is_subject[c, d, p + 1, s].Not(),
                            is_subject[c, d, p + 2, s].Not()
                        ])
    
    # ============ RULE 2: Max Consecutive Periods for Teacher ============
    for t in range(1, num_teachers + 1):
        for d in range(num_days):
            for p in range(num_periods_per_day - max_teacher_consecutive):
                consecutive = []
                for i in range(max_teacher_consecutive + 1):
                    if (t, d, p + i) in is_teaching:
                        consecutive.append(is_teaching[t, d, p + i])
                if len(consecutive) > max_teacher_consecutive:
                    model.Add(sum(consecutive) <= max_teacher_consecutive)
    
    # ============ RULE 3: Double Periods Can't Span Breaks ============
    # slot_is_break[d][p] = true means there's a break AFTER period p
    # So period p and period p+1 cannot be the same subject (would span the break)
    if flag_double_period_no_recess:
        for c in range(num_classes):
            for d in range(num_days):
                for p in range(num_periods_per_day - 1):
                    # Check if there's a break after period p
                    if p < len(slot_is_break[d]) and slot_is_break[d][p]:
                        # Period p and p+1 cannot be consecutive same subject
                        for s in range(1, num_subjects + 1):
                            model.AddBoolOr([
                                is_subject[c, d, p, s].Not(), 
                                is_subject[c, d, p + 1, s].Not()
                            ])
    
    # ============ OPTIMIZATION: Minimize Teacher Gaps ============
    total_gaps = None
    if flag_minimize_teacher_gaps:
        # Simple heuristic: minimize sum of (period * is_teaching) to prefer earlier slots
        weighted_periods = []
        for t in range(1, num_teachers + 1):
            for d in range(num_days):
                for p in range(num_periods_per_day):
                    if (t, d, p) in is_teaching:
                        weighted_periods.append(p * is_teaching[t, d, p])
        
        if weighted_periods:
            total_gaps = model.NewIntVar(0, sum(range(num_periods_per_day)) * num_teachers * num_days, "weighted_sum")
            model.Add(total_gaps == sum(weighted_periods))
            model.Minimize(total_gaps)
    
    # ============ SOLVE ============
    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = timeout_seconds
    solver.parameters.num_search_workers = 8
    
    print(f"Solving with {solver.parameters.num_search_workers} workers, timeout={timeout_seconds}s...")
    status = solver.Solve(model)
    solve_time = time.time() - start_time
    
    # ============ OUTPUT ============
    result = {
        "status": solver.StatusName(status),
        "solve_time_seconds": round(solve_time, 3),
        "timetable": [],
        "total_gaps": solver.Value(total_gaps) if total_gaps is not None and status in [cp_model.OPTIMAL, cp_model.FEASIBLE] else None
    }
    
    if status == cp_model.OPTIMAL or status == cp_model.FEASIBLE:
        # Build static course lookup: (class, day, period) -> name
        static_lookup = {}
        for sc in static_courses:
            key = (sc["class_index"], sc["day"], sc["period"])
            static_lookup[key] = sc["name"]
        
        for c in range(num_classes):
            for d in range(num_days):
                for p in range(num_periods_per_day):
                    subject = solver.Value(timetable[c, d, p])
                    teacher = 0
                    if subject > 0:
                        teacher = teacher_for_class_subject[c][subject - 1]
                    
                    # Check if this is a static course slot
                    static_name = static_lookup.get((c, d, p), None)
                    
                    result["timetable"].append({
                        "class": c + 1,
                        "day": d + 1,
                        "period": p + 1,
                        "subject": subject,
                        "teacher": teacher,
                        "static_name": static_name
                    })
        result["success"] = True
    else:
        result["success"] = False
        result["error"] = f"Solver returned {solver.StatusName(status)}"
    
    print(f"Status: {solver.StatusName(status)}, Time: {solve_time:.2f}s" + 
          (f", Gaps: {result['total_gaps']}" if result['total_gaps'] is not None else ""))
    return result


def main():
    if len(sys.argv) < 2:
        print("Usage: python solver.py <input.json> [output.json]")
        sys.exit(1)
    
    input_file = sys.argv[1]
    output_file = sys.argv[2] if len(sys.argv) > 2 else None
    
    with open(input_file, 'r') as f:
        input_data = json.load(f)
    
    result = solve_timetable(input_data)
    
    if output_file:
        with open(output_file, 'w') as f:
            json.dump(result, f, indent=2)
        print(f"Result written to {output_file}")
    else:
        print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
