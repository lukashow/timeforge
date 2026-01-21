% ============================================================
% TIMETABLE SCHEDULING MODEL - SIMPLIFIED
% Only the 4 rules requested by user
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
set of int: ROOMS = 1..num_rooms;
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

% ============ HARD CONSTRAINTS ============

% 1. Period count - each class gets required periods per subject
constraint forall(c in CLASSES, s in SUBJECTS)(
  sum(d in DAYS, p in PERIODS)(bool2int(timetable[c, d, p] = s)) = class_subject_periods[c, s]
);

% 2. Teacher conflict - teacher can only teach one class at a time
constraint forall(d in DAYS, p in PERIODS, t in TEACHERS)(
  sum(c in CLASSES)(bool2int(get_teacher(c, timetable[c, d, p]) = t)) <= 1
);

% ============ USER RULE 1: 同一科目不在同一天连续出现 ============
constraint if FLAG_NO_CONSECUTIVE_SAME_SUBJECT then
  forall(c in CLASSES, d in DAYS, p in 1..num_periods_per_day-1)(
    let { 
      var SUBJECTS_OR_NONE: s1 = timetable[c, d, p];
      var SUBJECTS_OR_NONE: s2 = timetable[c, d, p+1] 
    } in
    if s1 > 0 /\ s2 > 0 then s1 != s2 else true endif
  )
else true endif;

% ============ USER RULE 2: 避免教师连续授课3个班级以上 ============
constraint forall(t in TEACHERS, d in DAYS, p in 1..num_periods_per_day-MAX_TEACHER_CONSECUTIVE)(
  sum(i in 0..MAX_TEACHER_CONSECUTIVE)(
    bool2int(exists(c in CLASSES)(get_teacher(c, timetable[c, d, p+i]) = t))
  ) <= MAX_TEACHER_CONSECUTIVE
);

% ============ USER RULE 3: 双节不可跨过课间时间 ============
constraint if FLAG_DOUBLE_PERIOD_NO_RECESS then
  forall(c in CLASSES, d in DAYS, p in 1..num_periods_per_day-1)(
    let {
      var SUBJECTS_OR_NONE: s1 = timetable[c, d, p];
      var SUBJECTS_OR_NONE: s2 = timetable[c, d, p+1]
    } in
    if slot_is_break[d, p+1] /\ s1 > 0 /\ s2 > 0 then s1 != s2 else true endif
  )
else true endif;

% ============ SOLVE (NO OPTIMIZzATION FOR SPEED) ============

solve 
  :: int_search([timetable[c,d,p] | c in CLASSES, d in DAYS, p in PERIODS], first_fail, indomain_random)
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
