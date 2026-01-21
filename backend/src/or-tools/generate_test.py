#!/usr/bin/env python3
"""Generate test data for 240 classes, 800 teachers, 12 subjects"""
import json
import random

num_classes = 240
num_teachers = 800
num_subjects = 12
num_periods_per_day = 8
num_days = 5

# Each class needs approximately 40 periods per week (8*5=40)
# Distribute among 12 subjects: ~3-4 periods per subject
random.seed(42)  # For reproducibility

class_subject_periods = []
for c in range(num_classes):
    # Random periods per subject, summing to 40
    periods = [3] * num_subjects  # Start with 3 each = 36
    remaining = 40 - sum(periods)
    while remaining > 0:
        periods[random.randint(0, num_subjects - 1)] += 1
        remaining -= 1
    class_subject_periods.append(periods)

# Assign teachers: group classes into sets of 3, each set shares 12 teachers
teacher_for_class_subject = []
for c in range(num_classes):
    group = c // 3
    base_teacher = (group * 12) % num_teachers + 1
    teachers = [(base_teacher + s) for s in range(num_subjects)]
    # Wrap around if needed
    teachers = [(t - 1) % num_teachers + 1 for t in teachers]
    teacher_for_class_subject.append(teachers)

slot_is_break = [[False] * num_periods_per_day for _ in range(num_days)]

data = {
    "num_classes": num_classes,
    "num_teachers": num_teachers,
    "num_subjects": num_subjects,
    "num_rooms": 1,
    "num_periods_per_day": num_periods_per_day,
    "num_days": num_days,
    "class_subject_periods": class_subject_periods,
    "teacher_for_class_subject": teacher_for_class_subject,
    "teacher_unavailable": [],
    "subject_needs_lab": [False] * num_subjects,
    "subject_is_hard": [False] * num_subjects,
    "subject_is_pe": [False] * num_subjects,
    "room_is_lab": [False],
    "slot_is_break": slot_is_break,
    "MAX_TEACHER_CONSECUTIVE": 3,
    "FLAG_NO_CONSECUTIVE_SAME_SUBJECT": True,
    "FLAG_DOUBLE_PERIOD_NO_RECESS": False,
    "timeout_seconds": 300
}

with open("test-240-classes.json", "w") as f:
    json.dump(data, f, indent=2)

print(f"Generated test data: {num_classes} classes, {num_teachers} teachers, {num_subjects} subjects")
print(f"Total periods per class: {sum(class_subject_periods[0])}")
print(f"Saved to test-240-classes.json")
