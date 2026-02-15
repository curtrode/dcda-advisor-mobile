# DCDA Advisor Mobile

A mobile-first degree planning application for **Digital Culture & Data Analytics (DCDA)** students at TCU. This tool acts as an interactive wizard to help students audit their completed coursework and plan their future semesters leading up to graduation.

## Overview

The DCDA Advisor helps students navigate the complex requirements of the DCDA Major and Minor. It splits the advising process into two distinct phases:

1.  **History (Part 1):** Users record what they have already completed. The app enforces logic such as:
    *   Mutually exclusive courses (e.g., MATH 10043 vs INSC 20153).
    *   Core vs. Elective categorization.
    *   Transfer/Special credits (automatically mapped to General Electives for simplicity).
2.  **Planning (Part 2):** Based on the "Unmet" categories calculated from history, the app prompts the user to schedule specific courses for the upcoming semester.
3.  **Review:** A comprehensive dashboard showing progress bars, completed lists, and a generated Semester Plan through graduation.

## Key Features

*   **Smart Degree Logic:**
    *   Handles differences between **Major** (33 hours) and **Minor** (21 hours).
    *   Logic to push "overflow" elective credits into the General Elective bucket.
    *   Ensures core requirements skipped in Part 1 are excluded from Elective lists to prevent double-counting errors.
*   **Dynamic Scheduling:**
    *   Generates semester plans based on the user's expected graduation date.
    *   Supports optional **Summer Terms** logic via a toggle.
    *   Automatically schedules the Capstone course in the final Spring semester.
*   **Data-Driven:**
    *   Powered by JSON datasets for Course Catalog (`data/courses.json`) and specific Semester Offerings (`data/offerings-sp26.json`).
*   **Privacy First:**
    *   All data is stored locally in the browser (`localStorage`). No external database is used.

## Project Structure

```text
src/
├── components/
│   ├── ui/             # shadcn/ui components (Buttons, Dialogs, etc.)
│   └── wizard/         # Core logic for the advising flow
│       ├── steps/      # Individual screens (CourseStep, ScheduleStep, etc.)
│       └── WizardShell.tsx
├── data/
│   ├── courses.json    # Full course catalog
│   ├── requirements.json # Logic rules for Major/Minor
│   └── offerings-sp26.json # Courses available for the target semester
├── hooks/
│   ├── useStudentData.ts  # State management for user choices
│   └── useRequirements.ts # Grading engine / Progress calculation
└── services/
    └── courses.ts      # Helper functions for filtering and search
```

## Getting Started

### Prerequisites
*   Node.js (v18 or higher recommended)

### Installation
1.  Clone the repository.
2.  Install dependencies:
    ```bash
    npm install
    ```

### Development
Start the local development server:
```bash
npm run dev
```

### Build
Create a production build (outputs to `dist/`):
```bash
npm run build
```

## Integration: AddRan Advising Ecosystem

This wizard is a **producer** in the hub-and-spoke advising ecosystem. It publishes an advising manifest consumed by [Sandra](https://github.com/TCU-DCDA/addran-advisor-chat) (the AddRan chatbot).

### Manifest generation
```bash
# Generate manifest only
npm run generate-manifest

# Check schema version against source of truth
npm run check-schema
```

The `build` script runs manifest generation automatically before `tsc` and `vite build`.

### Key files
| File | Purpose |
|---|---|
| `scripts/generate-manifest.js` | Reads `data/*.json`, produces `public/advising-manifest.json` |
| `scripts/check-schema-version.js` | CI check — compares local schema version against English wizard |
| `schemas/manifest.schema.json` | Schema v1.0 (copied from source of truth) |
| `public/advising-manifest.json` | Generated output — 2 programs, 67 courses |
| `data/contacts.json` | Department contacts |
| `data/career-options.json` | Career paths for major/minor |

### Schema governance
- Source of truth: [`english-advising-wizard/schemas/manifest.schema.json`](https://github.com/TCU-DCDA/english-advising-wizard/blob/main/schemas/manifest.schema.json)
- CI checks schema version on every push and PR to `main`
- See [`INTEGRATION_EXECUTION_PLAN.md`](https://github.com/TCU-DCDA/english-advising-wizard/blob/main/INTEGRATION_EXECUTION_PLAN.md) for full integration spec

## Maintenance Notes

*   **Updating Offerings:** To prepare for a new semester, update `data/offerings-[term].json` and adjust the `getNextSemesterTerm()` helper in `services/courses.ts`.
*   **Requirement Changes:** Edit `data/requirements.json` to adjust credit hours, added courses, or new policy constraints.
*   **Updating Contacts/Careers:** Edit `data/contacts.json` and `data/career-options.json`, then run `npm run generate-manifest` to regenerate the advising manifest.

## License

Private / TCU Internal Use.
