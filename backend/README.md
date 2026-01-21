# LavaPunk - School Timetable Scheduling System

A comprehensive school timetable generation system with a multi-step wizard interface.

## System Overview

This system helps schools create optimized class schedules through a 7-step wizard:

1. **Time Grid Setup** - Define school hours, periods, and breaks
2. **Resource Library** - Manage subjects, teachers, and rooms
3. **Curriculum Design** - Configure disciplines and period allocations
4. **Class Factory** - Create classes and assign form teachers
5. **Assignment Matrix** - Assign subject teachers to each class
6. **Generation Tower** - Apply optimization rules and generate timetables
7. **Timetable Export** - Preview and export final schedules

---

## Data Models

### 1. TimeGrid Configuration
| Field | Type | Description |
|-------|------|-------------|
| `workDays` | number | Working days per week (5-7) |
| `periodsPerDay` | number | Max periods per day (6-12) |
| `breaks` | Break[] | Break periods with timing |
| `daySchedules` | DaySchedule | Period times per day |

**Break**:
- `name`: string (e.g., "午餐", "大课间")
- `duration`: number (minutes)
- `isHard`: boolean (prevents scheduling across)
- `afterPeriod`: number (after which period)

### 2. Resources

**Subject**:
| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Full name (数学) |
| `shortName` | string | Abbreviation (MAT) |
| `color` | string | Hex color (#8B5CF6) |
| `requiresLab` | boolean | Needs lab room |

**Teacher**:
| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Teacher name |
| `subjectId` | relation | Linked subject |
| `weeklyLoad` | number | Max periods/week |
| `unavailable` | number[][] | [day, period] pairs |

**Room**:
| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Room name/number |
| `tags` | string[] | Room capabilities |

### 3. Curriculum

**Discipline** (学科组 - e.g., "高一理科"):
| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Discipline name |
| `category` | string | School section |
| `subjectAllocations` | SubjectAllocation[] | Period configs |
| `staticCourses` | StaticCourse[] | Fixed slots |

**SubjectAllocation**:
- `subjectId`: relation to Subject
- `totalPeriods`: number (weekly total)
- `doublePeriods`: number (2-period blocks)
- `singlePeriods`: number (computed)
- `requiresLab`: boolean

**StaticCourse** (固定课程 - e.g., "周会"):
- `name`: string
- `day`: number (0-6)
- `period`: number (1-12)
- `color`: string

### 4. Classes

**Class**:
| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Class name (高一(1)班) |
| `category` | string | School section |
| `disciplineId` | relation | Linked discipline |
| `formTeacherId` | relation | Class teacher |

### 5. Assignments

**Assignment** (Teacher-Class-Subject mapping):
| Field | Type | Description |
|-------|------|-------------|
| `classId` | relation | Target class |
| `subjectId` | relation | Subject taught |
| `teacherId` | relation | Assigned teacher |

### 6. Generation (Future)

**Timetable Entry**:
| Field | Type | Description |
|-------|------|-------------|
| `classId` | relation | Class |
| `day` | number | Day of week |
| `period` | number | Period number |
| `subjectId` | relation | Subject |
| `teacherId` | relation | Teacher |
| `roomId` | relation | Room (optional) |

---

## API Endpoints

### Subjects
- `GET /api/subjects` - List all subjects
- `POST /api/subjects` - Create subject
- `PUT /api/subjects/:id` - Update subject
- `DELETE /api/subjects/:id` - Delete subject

### Teachers
- `GET /api/teachers` - List all (with subject expand)
- `POST /api/teachers` - Create teacher
- `PUT /api/teachers/:id` - Update teacher (including unavailable)
- `DELETE /api/teachers/:id` - Delete teacher

### Rooms
- `GET /api/rooms` - List all rooms
- `POST /api/rooms` - Create room
- `POST /api/rooms/bulk` - Create multiple rooms
- `DELETE /api/rooms/:id` - Delete room

### Disciplines
- `GET /api/disciplines` - List all disciplines
- `POST /api/disciplines` - Create discipline
- `PUT /api/disciplines/:id` - Update (with allocations/static courses)
- `DELETE /api/disciplines/:id` - Delete discipline

### Classes
- `GET /api/classes` - List all classes
- `POST /api/classes` - Create class
- `POST /api/classes/bulk` - Create multiple classes
- `PUT /api/classes/:id` - Update class
- `DELETE /api/classes/:id` - Delete class

### Assignments
- `GET /api/assignments` - List all assignments
- `PUT /api/assignments/batch` - Batch update assignments
- `POST /api/assignments/auto-assign` - Auto-assign teachers

### Time Grid
- `GET /api/time-grid` - Get current config
- `PUT /api/time-grid` - Update config

### Timetable Generation (Placeholder)
- `POST /api/timetable/generate` - Start generation
- `GET /api/timetable/:classId` - Get class timetable
- `GET /api/timetable/teacher/:teacherId` - Get teacher schedule

---

## Technology Stack

- **Backend**: Express.js + TypeScript + Bun
- **Database**: PocketBase (SQLite-based)
- **Frontend**: React + TypeScript + Vite + Tailwind CSS

## Development

```bash
# Start PocketBase
cd backend/pocketbase && ./pocketbase serve

# Start backend
cd backend && bun run dev

# Start frontend
cd frontend && bun dev
```
