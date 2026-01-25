# DCDA Advisor Mobile - AI Agent Instructions

## Project Overview
A **React 19 + TypeScript + Vite** PWA for TCU DCDA degree planning. Mobile-first wizard interface that guides students through four parts: recording completed coursework (Part 1), scheduling future courses (Part 2), reviewing progress (Part 3), and saving/submitting (Part 4).

## Architecture

### Data Flow
```
data/*.json → services/courses.ts → hooks/useRequirements.ts → App.tsx → wizard steps
                                   ↓
                          hooks/useStudentData.ts → localStorage
```

- **State Management**: All wizard state lives in [App.tsx](../src/App.tsx) and flows down. Student data persists via `useStudentData` hook to `localStorage`.
- **Course/Requirement Logic**: [useRequirements.ts](../src/hooks/useRequirements.ts) calculates degree progress with overflow logic (extra electives → generalElectives bucket).
- **Wizard Navigation**: [useWizardFlow.ts](../src/hooks/useWizardFlow.ts) dynamically builds step sequence based on `degreeType` (major/minor) and unmet categories.

### Key Domain Concepts
- **Major vs Minor**: Minors skip `intro`, `dcElective`, `daElective` steps. See `MAJOR_ONLY_STEPS` in useWizardFlow.
- **Flexible Courses**: `DCDA 40273`, `DCDA 30970` can count as DC Elective, DA Elective, or General Elective (configured via `courseCategories` in StudentData).
- **Mutually Exclusive Courses**: Defined in [requirements.json](../data/requirements.json) `mutuallyExclusive` array (e.g., MATH 10043 vs INSC 20153).
- **Special Credits**: Transfer/study-abroad credits mapped to specific requirement categories.

## File Conventions

### Data Files (`data/`)
- `courses.json` - Full course catalog with `code`, `title`, `category`
- `requirements.json` - Degree requirements, prerequisites, mutual exclusions
- `offerings-sp26.json` - Courses offered for specific semester (update for new terms)

### Component Structure
```
src/components/wizard/
├── WizardShell.tsx      # Layout wrapper with header, nav, step indicator
├── StepIndicator.tsx    # Visual progress bar
└── steps/               # Individual wizard screens
    ├── CourseStep.tsx       # Reusable course selection (single/multi-select)
    ├── ScheduleStep.tsx     # Part 2: schedule unmet requirements
    ├── ReviewSummaryStep.tsx # Part 3: progress and course summary
    └── ReviewActionsStep.tsx # Part 4: notes, export, submit
```

### Path Aliases
Use `@/` for src imports: `import { useStudentData } from '@/hooks/useStudentData'`

## Development Commands
```bash
npm run dev      # Start dev server (Vite)
npm run build    # TypeScript check + production build
npm run lint     # ESLint
npm run preview  # Preview production build
```

## Deployment
- **GitHub Pages**: Deployed to `https://<org>.github.io/dcda-advisor-mobile/`
- Base path configured in [vite.config.ts](../vite.config.ts) as `/dcda-advisor-mobile/`
- **Firebase Hosting**: Alternative deployment configured in [firebase.json](../firebase.json) (SPA rewrites enabled)

## Testing
⚠️ **No test framework configured yet.** Testing infrastructure needs to be developed.

## Critical Patterns

### Adding New Wizard Steps
1. Add step ID to `WizardStepId` union in [types/index.ts](../src/types/index.ts)
2. Add step definition in `ALL_PART_1_STEPS` array in [useWizardFlow.ts](../src/hooks/useWizardFlow.ts)
3. Handle the step in App.tsx `switch` statement for `renderStepContent()`
4. Update `canProceed` logic in App.tsx if step has validation

### Updating Semester Offerings
1. Create new `data/offerings-[term].json` file
2. Update import in [services/courses.ts](../src/services/courses.ts)
3. Verify `getNextSemesterTerm()` returns correct term label

### Course Selection Logic
- `completedRequiredCourses` tracks courses fulfilling required categories → excluded from elective lists
- `allSelectedCourses` tracks all selections → prevents double-selection
- `notYetSelections` tracks skipped categories → determines Part 2 scheduling steps

## UI Framework
- **shadcn/ui** components in `src/components/ui/` (Button, Dialog, Checkbox, etc.)
- **Tailwind CSS v4** with custom CSS variables in [index.css](../src/index.css) for theming
- **Lucide React** for icons
- Mobile-safe-area handling via `env(safe-area-inset-bottom)`

## Export Features
[services/export.ts](../src/services/export.ts) provides:
- `exportToCSV()` - Student data for re-import
- `exportToPDF()` - Formatted degree audit document
- `exportToEmail()` - Opens mail client with degree summary

## Future Integrations
- **Power Automate**: Email workflow integration in development. See [docs/power-automate-setup.md](../docs/power-automate-setup.md) for setup guidance.

## Unused Dependencies
- `@azure/msal-browser`, `@microsoft/microsoft-graph-client` - Legacy from previous Azure integration attempt; can be removed.
