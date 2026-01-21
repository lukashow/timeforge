VERY DETAILED STRUCTURE EXPLANATION
=================================

This document is an exhaustive, developer-focused explanation of the repository layout, runtime responsibilities, data flows, UI state flows, and operational considerations for the project stored at the repository root. It is intended to help new contributors, maintainers, and integrators quickly understand how the backend and frontend are organized, how data moves end-to-end, and what common operations are required during development, testing and deployment.

Contents
--------
- **High-level overview**
- **Root-level files and purpose**
- **Backend: detailed structure and responsibilities**
  - PocketBase service and data model
  - Backend source layout (`backend/src`)
  - Routes and HTTP surface
  - Middleware and error handling
  - Scripts and migrations
  - Types and developer ergonomics
- **Frontend: detailed structure and responsibilities**
  - High-level app routing & shell
  - `src` folders: components, features, hooks, lib, constants, types
  - UI state flows and data fetching patterns
  - Component categories and conventions
  - Build/test/deploy config
- **Reference design**
- **Data model mapping (inferred from migrations & types)**
- **Dev workflow and common commands**
- **Deployment and hosting notes**
- **Testing, linting and CI suggestions**
- **Security and operational considerations**
- **Recommended next steps & points of attention**

High-level overview
-------------------

This repository is split into three primary top-level areas:

- `backend/` — Node/TypeScript code that acts as a small API layer and companion to an embedded PocketBase instance. It contains API routes that interact with PocketBase collections and exposes a web service for the frontend and other clients.
- `frontend/` — A Vite + React + TypeScript single-page application providing the user interface and client-side routing, built as modern modular frontend code with `features/` oriented architecture.
- `reference-design/` — A separate frontend reference or design system repo (also Vite + React) used for guidance, examples, or visual reference components.

The backend appears to be tightly integrated with PocketBase (a Go-based embedded backend that provides a small database + auth + file storage + API), with migrations recorded under `pb_migrations`. The frontend consumes the backend (PocketBase + wrapper endpoints) and organizes UI by features and shared components.

Root-level files and purpose
---------------------------

- `backend/package.json`, `frontend/package.json`, `reference-design/package.json` — package manifests for each subproject. Use these to run, build, and add dependencies within each subproject directory.
- `frontend/vite.config.ts`, `reference-design/vite.config.ts` — Vite configuration files for building and running the frontend apps.
- `backend/README.md`, `frontend/README.md`, `reference-design/README.md` — human-readable notes and quickstart instructions for each area.

Backend — detailed structure and responsibilities
-----------------------------------------------

Location: `backend/`

Primary responsibilities:
- Serve as a lightweight API layer and orchestrator for PocketBase interactions.
- Provide HTTP endpoints (routes) that implement application-level logic beyond raw PocketBase collection operations.
- Run PocketBase server binary (under `pocketbase/`) and manage migrations & scripts for collection setup.

Key subfolders and files

- `pocketbase/` — Contains the PocketBase binary `pocketbase`, and `pb_data/` (containing types and runtime DB files) and `pb_migrations/` (migration scripts). This directory houses the actual embedded database server used by the backend.
  - `pocketbase/pocketbase` — The PocketBase server binary. The backend expects this to be present and runnable in dev or production when using the integrated PocketBase service.
  - `pocketbase/pb_migrations/` — Migration scripts (JavaScript) that create or update PocketBase collections. Filenames indicate timestamps and the migration's purpose, e.g., `1768831103_created_assignments.js`.
  - `pocketbase/pb_data/types.d.ts` — PocketBase-generated TypeScript types for collections accessible to backend code.

- `src/` — The TypeScript source for the backend service. Important files and folders below:
  - `index.ts` — Likely the server entrypoint. Starts the HTTP server, sets up middleware, and mounts routes.
  - `config/env.ts` — Environment variable handling. Contains runtime configuration such as ports, connection URLs, secrets, and other configurable values.
  - `lib/pocketbase.ts` — A small wrapper or client module that encapsulates PocketBase SDK usage. This module ensures consistent initialization and provides helper functions to interact with PocketBase collections.
  - `middleware/error.ts` — Error handling middleware that normalizes exceptions and returns consistent HTTP error responses.
  - `routes/*.ts` — Route handlers organized by resource: `assignments.ts`, `classes.ts`, `disciplines.ts`, `health.ts`, `index.ts`, `rooms.ts`, `subjects.ts`, `teachers.ts`, `time-grid.ts`, `timetable.ts`.
    - The `health.ts` route is usually used for readiness and liveness checks and should return simple status for orchestrators.
    - The `index.ts` route probably mounts or aggregates the other routers and may provide root-level endpoints.
  - `scripts/` — Utilities to manage the PocketBase environment and collections:
    - `create-relations.ts` — Creates or applies relational setup between PocketBase collections after records exist.
    - `setup-collections.ts` — Automates the creation of PocketBase collections according to the app's schema.
    - `update-rules.ts` — Updates collection-level or record-level rules (PocketBase RBAC) for access control.
  - `types/pocketbase.d.ts` — Type declarations used across the backend to provide type-safety for PocketBase models.

PocketBase model and migrations
--------------------------------

PocketBase stores collection schemas and migration scripts are present in `pocketbase/pb_migrations`. File names include timestamps and an action (created, updated, deleted) followed by the collection name, e.g., `1768831103_created_assignments.js`. Inspect these scripts to extract field names, relations, and indexes.

From the migrations available we can infer there are collections named: `assignments`, `classes`, `disciplines`, `rooms`, `subjects`, `teachers`, `time_grid`. Migrations include created, updated and deleted operations indicating iterative schema evolution.

Backend data flow (typical request lifecycle)
--------------------------------------------

1. Incoming HTTP request hits Express/Koa/Fastify-like server in `src/index.ts`.
2. Global middleware (logging, body parsing, CORS, etc.) runs.
3. Route handler (one of `src/routes/*.ts`) receives the request.
4. Route handler calls `lib/pocketbase.ts` or direct PocketBase client to read/write collections.
5. Business logic may use helper scripts from `scripts/` (for setup) or types from `types/pocketbase.d.ts`.
6. Errors bubble to `middleware/error.ts` which returns standardized error payload.

Routes surface
--------------

- `assignments`, `classes`, `disciplines`, `rooms`, `subjects`, `teachers`, `time-grid`, `timetable` — REST-like endpoints mapping to PocketBase collections, probably exposing CRUD and specialized queries for timetable generation and assignment management.
- `health` — readiness checks for orchestration and monitoring.

Middleware and error handling
----------------------------

The project contains an `error.ts` middleware. Expect it to catch errors thrown from async route handlers, log details (maybe to console or a logger), and return JSON error responses with appropriate HTTP status codes. Ensure all asynchronous route handlers use try/catch or provide errors to the framework's error flow so middleware can handle them.

Scripts and repository maintenance utilities
-----------------------------------------

The `scripts/` folder contains tooling to bootstrap or update PocketBase collections and relations. Typical usage flows:
- Run `setup-collections.ts` once to establish collections in a fresh PocketBase instance.
- Run `create-relations.ts` to add relational links between existing collections.
- Run `update-rules.ts` when deployment changes require adjusting record/collection access control.

Backend runtime nuances
-----------------------

- PocketBase binary: The project includes the PocketBase binary; ensure executable permissions are set (`chmod +x pocketbase/pocketbase`). The backend or developer run scripts likely assume this binary is runnable in the `pocketbase/` directory.
- Data persistence: PocketBase will use `pb_data` for data files and built-in SQLite or internal storage. Don't delete `pb_data` if you want to keep local development state.
- Migrations: PocketBase migrations are JS files; executing them in correct order (timestamp order) is important.

Frontend — detailed structure and responsibilities
-------------------------------------------------

Location: `frontend/`

Primary responsibilities:
- Provide the complete user interface for interacting with timetable data, assignments, classes, subjects, teachers, rooms, and other domain entities.
- Present forms, lists, editors, and visual timetable components.
- Communicate with the backend (PocketBase + backend wrappers) to fetch and mutate data.

Key files and folders

- `index.html` — HTML shell for the SPA.
- `src/main.tsx` — App bootstrapping and router mounting.
- `src/App.tsx` — Top-level component that wires up routes, global providers (state, theme, i18n), and application layout.
- `src/App.css`, `src/index.css` — Global styles.
- `src/constants/` — Shared constant definitions:
  - `periods.ts`, `subjects.ts`, `weekdays.ts` — Domain constants for scheduling UI and business logic.
- `src/features/` — Feature-oriented folders (likely mirrors backend collections): `assignments`, `classes`, `curriculum`, etc. Each feature likely contains pages, components, hooks, and services specific to the feature.
- `src/components/` — Shared components across features. Subfolders: `layout/`, `shared/`, `ui/` capturing layout primitives, shared building blocks, and UI primitives (buttons, inputs, dialogs, etc.).
- `src/hooks/` — Reusable React hooks for data fetching, mutation, and UI state management (e.g., `useFetchAssignments`, `useAuth`.
- `src/lib/` — Client libraries and utilities used across the frontend (e.g., PocketBase client wrapper, API clients, formatting helpers).
- `src/types/` — Frontend TypeScript types shared across components.
- `vite.config.ts`, `tsconfig.*.json` — Build and TypeScript configuration.

State management & data fetching patterns
----------------------------------------

Although not all implementation details are visible from the file tree, typical patterns used in similar codebases include:

- Feature-level data hooks: Each feature in `src/features/*` exposes hooks (in `hooks/` or `lib/`) to fetch data and perform mutations, encapsulating calls to the PocketBase client.
- Global providers: `App.tsx` likely wraps routes with providers — e.g., authentication provider, state management provider (Context, Redux Toolkit, or Zustand), and UI theme provider.
- UI state (modals, toasts, form state): Managed locally via component state or via shared UI context/hooks in `src/components/ui/`.
- Optimistic updates & caching: For better UX, the frontend may implement optimistic updates for create/update operations and local caching via SWR/React Query or custom caches in `lib/`.

Routing and navigation
----------------------

The SPA routing is likely built using React Router (or similar) and mounted in `main.tsx`/`App.tsx`. Routes map to features, e.g., `/assignments`, `/classes`, `/timetable`.

Component categories and conventions
----------------------------------

- `layout/` — Shell components, common page frames, nav bars, sidebars, responsive behaviors.
- `shared/` — Reusable components composed of UI primitives but still application-specific (e.g., `SubjectCard`, `TeacherList`).
- `ui/` — Low-level primitives (buttons, inputs, dialogs) likely reusable across apps.

UI state flows (detailed examples and reasoning)
-----------------------------------------------

The following subsections explain typical and inferred UI flows for core features. Use them as both documentation and as guidance for future changes.

1) Authentication & App Initialization
  - On app load (`main.tsx`), the app checks persisted auth (e.g., `localStorage`) or PocketBase SDK session.
  - If a valid session exists, the app restores user context into an `AuthProvider` and proceeds to fetch bootstrap data (current user's profile, essential lists) via `lib/pocketbase.ts`.
  - If not authenticated, UI redirects to a sign-in or limited-access route.

2) List view -> Detail view (e.g., Teachers)
  - User navigates to `/teachers`.
  - Feature hook `useTeachers()` triggers a fetch from the backend (paginated or all) and stores results in a local cache or context.
  - The list component renders teacher rows; selecting a teacher navigates to `/teachers/:id`.
  - Detail view uses `useTeacher(id)` to fetch or reuse cached record and render editable fields. Mutations call API, await success, and update cache.

3) Timetable creation flow (complex multi-entity flow)
  - Timetabling involves many domain entities: `classes`, `teachers`, `subjects`, `rooms`, `time_grid`.
  - UI likely provides a multi-step flow: select class, assign subjects and teachers to periods, resolve conflicts (room or teacher collisions), and finalize the timetable.
  - State for in-progress timetable creation might be kept in a feature-level context (e.g., `TimetableDraftContext`) so multiple components can read/write draft state without repeatedly hitting the backend.
  - When saving, the UI validates conflicts locally, shows warnings, and persists via the backend route `timetable.ts`.

4) Real-time updates and collaborative scenarios
  - If PocketBase real-time / pubsub features are used (PocketBase has Realtime via websockets), the frontend may subscribe to changes for key collections and update UI optimistically on events.

Error handling and UX patterns
------------------------------

- Show inline field validation for forms.
- Use toast/notification system for server-level errors and success confirmations.
- Show global loading states for expensive operations and skeleton UIs for lists.

Reference-design folder
----------------------

The `reference-design/` folder is a separate Vite app with its own `src/` and `components/`. Use it as a style and UX reference — it may contain design system tokens, example components, or curated CSS useful to align the production app look-and-feel.

Data model mapping (inferred)
----------------------------

From migration filenames and the presence of `types.d.ts` (PocketBase), we infer the following primary collections and relationships:
- `assignments` — tasks or homework with fields linking to `subjects`, `classes`, `teachers` and possibly due dates.
- `classes` — school class or cohort entities.
- `disciplines` — higher-level curriculum categories.
- `rooms` — physical rooms with capacity and attributes.
- `subjects` — subject definitions mapping to `teachers` and `classes`.
- `teachers` — teacher profiles and (possibly) availability rules.
- `time_grid` — scheduling grid/configuration (periods per day, weekdays, time windows).

Relationships likely include:
- `class` has many `subjects` and `assignments`.
- `subject` is taught by one or more `teachers`.
- `time_grid` defines the schedule schema used by `timetable`.

To extract exact field names and rules, inspect `pocketbase/pb_migrations/*.js` files and `pocketbase/pb_data/types.d.ts` which contain explicit field declarations.

Dev workflow and common commands
--------------------------------

Typical development session:

1. Start PocketBase (if the backend doesn't auto-start it):

```bash
cd backend/pocketbase
./pocketbase serve
```

2. From the backend root, install dependencies and start the backend server (if it has a dev script):

```bash
cd backend
npm install
npm run dev
```

3. From the frontend root, install dependencies and start the dev server:

```bash
cd frontend
npm install
npm run dev
```

Notes:
- If the backend process expects PocketBase binary to be present and executable, ensure `pocketbase/pocketbase` has appropriate permissions.
- Use `scripts/setup-collections.ts` after a fresh PocketBase to prepare collections.

Build & deployment notes
------------------------

- Frontend: Use `npm run build` in `frontend/` to produce a production bundle. Deploy via static hosting (Netlify, Vercel, S3 + CloudFront) or containerized app.
- Backend: If the backend is a lightweight Node server + PocketBase binary, deploy on a VM or container where the `pocketbase` binary can run. Consider a dedicated PocketBase host or use the binary inside a Docker container.

Suggested Docker approach (high level):

- Create a multi-stage Dockerfile that copies `backend/` code and the `pocketbase` binary into the image, ensures the binary is executable, and starts PocketBase followed by the Node backend (or use a process manager to run both). Alternatively, run PocketBase and the Node service as separate containers and link them.

Testing, linting and CI suggestions
----------------------------------

- Add unit tests for:
  - backend route handlers (mock PocketBase client)
  - scripts that manipulate PocketBase schema
  - frontend feature hooks and critical components
- Add integration tests that run a test PocketBase instance (or in-memory mode if possible) and verify core flows (auth, create class, create timetable).
- Add linting and formatting (ESLint + Prettier) across both frontend and backend projects with shared configs.
- CI pipeline should run: `npm ci`, `npm test`, `npm run build` for both frontend and backend as appropriate.

Security and operational considerations
-------------------------------------

- Secrets: Keep PocketBase admin tokens, API keys, and other secrets out of the repository; use environment variables and secret managers for deployments.
- Access rules: Ensure `update-rules.ts` is used to set minimal privileged access for collections — avoid exposing administrative endpoints to unauthenticated users.
- Backups: PocketBase stores data in files; schedule backups of `pb_data` regularly.
- Rate limiting: Consider adding request throttling to the backend to prevent abuse.

Recommended next steps & points of attention
-------------------------------------------

1. Inspect `pocketbase/pb_migrations/*.js` and `pocketbase/pb_data/types.d.ts` to extract exact field names, types, and relation definitions and update this document with concrete schemas.
2. Add small README snippets in `backend/` and `frontend/` that list the exact dev start commands (pocketbase serve, npm run dev) and any environment variables required.
3. Add or confirm PocketBase startup in `backend/src/index.ts` (if not present) so the Node server can optionally auto-start the PocketBase binary in dev mode.
4. Consider adding a `docker-compose.yml` for local development which starts PocketBase, the Node backend, and the frontend for straightforward onboarding.
5. Add frontend type generation from PocketBase types so that the frontend `src/types/` can be kept in sync with backend models (e.g., copy `pocketbase/pb_data/types.d.ts` or derive types into `frontend/src/types/`).

References: key paths to inspect
--------------------------------

- Backend entry: [backend/src/index.ts](backend/src/index.ts#L1)
- PocketBase binary: [backend/pocketbase/pocketbase](backend/pocketbase/pocketbase#L1)
- PocketBase migrations: [backend/pocketbase/pb_migrations](backend/pocketbase/pb_migrations#L1)
- Backend routes: [backend/src/routes/index.ts](backend/src/routes/index.ts#L1)
- Backend pocketbase types: [backend/pocketbase/pb_data/types.d.ts](backend/pocketbase/pb_data/types.d.ts#L1)
- Frontend app entry: [frontend/src/main.tsx](frontend/src/main.tsx#L1)
- Frontend features root: [frontend/src/features](frontend/src/features#L1)
- Frontend components: [frontend/src/components](frontend/src/components#L1)

Final notes
-----------

This document is intentionally comprehensive at a structural and conceptual level, but for some sections (exact field names, concrete examples of requests/responses), you should inspect the referenced source files directly. The next recommended actions are to:

- Run the backend PocketBase migrations and examine the generated collection schemas in `pb_data` for precise fields and relations.
- Open the frontend `features` and `hooks` to extract actual hook names and patterns used for data fetching and then codify them in a developer onboarding guide.

If you want, I can now:

- Extract exact collection schemas from the migration scripts and append them to this file.
- Generate a `docker-compose.yml` for local development to start PocketBase + backend + frontend.
- Add short README sections to `backend/` and `frontend/` with exact start commands and environment variable templates.

Would you like me to extract the concrete schemas from `pb_migrations` next and update this document with detailed field-level definitions?
