% ============================================================
% TIMETABLE SCHEDULING MODEL - MINIMAL FOR TESTING
% ============================================================

include "globals.mzn";

% ============ INPUT PARAMETERS ============

int: num_classes;
int: num_teachers;
int: num_subjects;
int: num_rooms;
int: num_periods_per_day;
int: num_days;

set of int: CLASSES = 1..num_classes;
set of int: TEACHERS = 1..num_teachers;
set of int: SUBJECTS = 1..num_subjects;
set of int: PERIODS = 1..num_periods_per_day;
set of int: DAYS = 1..num_days;

set of int: SUBJECTS_OR_NONE = 0..num_subjects;
set of int: TEACHERS_OR_NONE = 0..num_teachers;

% ============ DATA ARRAYS ============

array[CLASSES, SUBJECTS] of int: class_subject_periods;
array[CLASSES, SUBJECTS] of TEACHERS_OR_NONE: teacher_for_class_subject;
array[TEACHERS, DAYS, PERIODS] of bool: teacher_unavailable;
array[SUBJECTS] of bool: subject_needs_lab;
array[SUBJECTS] of bool: subject_is_hard;
array[SUBJECTS] of bool: subject_is_pe;
array[ROOMS] of bool: room_is_lab;
array[DAYS, PERIODS] of bool: slot_is_after_recess;
array[DAYS, PERIODS] of bool: slot_is_after_lunch;
array[DAYS, PERIODS] of bool: slot_is_morning;
array[DAYS, PERIODS] of bool: slot_is_break;

% ============ FLAGS ============

int: MAX_TEACHER_CONSECUTIVE;
bool: FLAG_TEACHER_DAILY_BALANCE;
bool: FLAG_PE_AFTER_RECESS;
bool: FLAG_NO_CONSECUTIVE_SAME_SUBJECT;
bool: FLAG_NO_HARD_AFTER_LUNCH;
bool: FLAG_HARD_IN_MORNING;
bool: FLAG_LAB_NEEDS_LAB_ROOM;
bool: FLAG_DOUBLE_PERIOD_NO_RECESS;
bool: FLAG_MINIMIZE_TEACHER_GAPS;

% ============ DECISION VARIABLES ============

array[CLASSES, DAYS, PERIODS] of var SUBJECTS_OR_NONE: timetable;

% ============ HELPER ============

function var TEACHERS_OR_NONE: get_teacher(CLASSES: c, var SUBJECTS_OR_NONE: s) =
  if s = 0 then 0 else teacher_for_class_subject[c, s] endif;

% ============ CONSTRAINTS ============

% 1. Period count - each class gets required periods per subject
constraint forall(c in CLASSES, s in SUBJECTS)(
  sum(d in DAYS, p in PERIODS)(bool2int(timetable[c, d, p] = s)) = class_subject_periods[c, s]
);

% 2. Teacher conflict - teacher can only teach one class at a time
constraint forall(d in DAYS, p in PERIODS, t in TEACHERS)(
  sum(c in CLASSES)(bool2int(get_teacher(c, timetable[c, d, p]) = t)) <= 1
);

% 3. No consecutive same subject (Rule 1)
constraint if FLAG_NO_CONSECUTIVE_SAME_SUBJECT then
  forall(c in CLASSES, d in DAYS, p in 1..num_periods_per_day-1)(
    timetable[c, d, p] = 0 \/ timetable[c, d, p+1] = 0 \/ timetable[c, d, p] != timetable[c, d, p+1]
  )
else true endif;

% ============ SOLVE ============

solve 
  :: int_search([timetable[c,d,p] | c in CLASSES, d in DAYS, p in PERIODS], input_order, indomain_min)
  satisfy;

% ============ OUTPUT ============

output [
  "{ \"status\": \"satisfied\", \"timetable\": [\n"
] ++
[
  if c = 1 /\ d = 1 /\ p = 1 then "" else ", " endif ++
  "{ \"class\": " ++ show(c) ++ 
  ", \"day\": " ++ show(d) ++ 
  ", \"period\": " ++ show(p) ++ 
  ", \"subject\": " ++ show(timetable[c, d, p]) ++
  ", \"teacher\": " ++ show(fix(get_teacher(c, timetable[c, d, p]))) ++ " }\n"
  | c in CLASSES, d in DAYS, p in PERIODS
] ++
[
  "] }"
];
