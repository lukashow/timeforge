# TimeForge 

A comprehensive school timetable management and generation system.

## System Overview

TimeForge is designed to help schools create optimized class schedules through a structured 7-step wizard interface:

1.  **Time Grid Setup**: Define school hours, periods, and breaks.
2.  **Resource Library**: Manage subjects, teachers, and rooms.
3.  **Curriculum Design**: Configure disciplines and period allocations.
4.  **Class Factory**: Create classes and assign form teachers.
5.  **Assignment Matrix**: Assign subject teachers to each class.
6.  **Generation Tower**: Apply optimization rules and generate timetables.
7.  **Timetable Export**: Preview and export final schedules.

## Technology Stack

-   **Runtime**: [Bun](https://bun.sh/)
-   **Frontend**: React, TypeScript, Vite, Tailwind CSS, shadcn/ui
-   **Backend**: Express.js, TypeScript
-   **Database**: PocketBase (SQLite-based)

## Prerequisites

-   [Bun](https://bun.sh/) (v1.0.0 or later)
-   Linux/macOS (recommended) or Windows (via WSL)

## Getting Started

1.  **Install Dependencies**

    Run the following command in the root directory to install dependencies for both frontend and backend:

    ```bash
    bun install
    ```

2.  **Start the Application**

    To start the Backend, PocketBase, and Frontend concurrently:

    ```bash
    bun dev
    ```

    This will launch:
    -   **Frontend**: [http://localhost:3000](http://localhost:3000)
    -   **Backend**: [http://localhost:3001](http://localhost:3001)
    -   **PocketBase**: [http://127.0.0.1:8090/_/](http://127.0.0.1:8090/_/)

## Project Structure

-   `/frontend`: React application with distinct feature modules (Time Grid, Assignments, Generation, etc.).
-   `/backend`: Express application handling API logic and integration with PocketBase.
-   `/backend/pocketbase`: Contains the PocketBase executable and data (`pb_data`).
-   `/reference-design`: Contains legacy or reference design assets.

## Features

-   **Multi-step Wizard**: Guided process for setting up complex scheduling constraints.
-   **Visual Time Grid**: Interactive configuration of daily schedules and breaks.
-   **Conflict Detection**: (In Progress) Rules to prevent double-booking teachers or rooms.
-   **Data Export**: Export generated timetables to PDF/Excel (Feature in progress).
