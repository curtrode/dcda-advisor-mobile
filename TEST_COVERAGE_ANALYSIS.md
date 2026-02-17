# Test Coverage Analysis

## Current State

**Overall coverage: 11.6% statements, 10.2% branches, 14.2% functions, 11.4% lines**

| File / Area | Stmts | Branch | Funcs | Lines | Verdict |
|---|---|---|---|---|---|
| `src/hooks/useRequirements.ts` | 88.8% | 72.1% | 95.2% | 90.1% | Good |
| `src/services/courses.ts` | 29.4% | 30.1% | 50% | 29.2% | Needs work |
| `src/services/export.ts` | 9.3% | 10.8% | 8.1% | 9.4% | Critical gap |
| `src/hooks/useWizardFlow.ts` | 0% | 0% | 0% | 0% | Untested |
| `src/hooks/useStudentData.ts` | 0% | 0% | 0% | 0% | Untested |
| `src/App.tsx` | 0% | 0% | 0% | 0% | Untested |
| All wizard step components | 0-3% | 0-5% | 0-3% | 0-3% | Untested |

**Test inventory:** 4 test files, 41 tests total.

---

## Priority 1: Pure Logic with High Business Value

### 1A. `courses.ts` - `getSemestersUntilGraduation` and `buildSemesterPlan` (0% covered)

These two functions at `src/services/courses.ts:167-299` contain the core semester planning algorithm - distributing courses across semesters, handling capstone scheduling, summer inclusion, and graduation date parsing. They are pure functions with zero test coverage despite being central to what the app produces.

**Recommended tests:**
- `getSemestersUntilGraduation` with various graduation dates (Spring, Fall, Summer)
- `getSemestersUntilGraduation` with `includeSummer = true` vs `false`
- `getSemestersUntilGraduation` with `null` graduation (default behavior)
- `getSemestersUntilGraduation` with unparseable graduation string
- `buildSemesterPlan` distributes courses evenly across semesters
- `buildSemesterPlan` places capstone in the correct Spring semester
- `buildSemesterPlan` puts scheduled courses in the first semester
- `buildSemesterPlan` handles empty inputs
- `buildSemesterPlan` handles case where more slots are needed than semesters available

**Why:** These are pure, easily testable functions with no React dependencies. They encode the core planning logic and edge cases around capstone scheduling.

### 1B. `courses.ts` - `getCapstoneTargetSemester` and `shouldTakeCapstoneNow` (0% covered)

Located at `src/services/courses.ts:137-152`. Pure functions that determine capstone timing. Straightforward to test.

**Recommended tests:**
- Returns `"Spring YYYY"` for various graduation dates
- Returns `null` for `null` input
- Returns `null` for unparseable string
- `shouldTakeCapstoneNow` returns true only for Spring 2026 graduation

### 1C. `courses.ts` - `getEnrollmentWarning` and `getSectionsForCourse` (0% covered)

Located at `src/services/courses.ts:89-121`. These read from data files and are easy to test with real data.

**Recommended tests:**
- `getEnrollmentWarning` returns message for courses with warnings
- `getEnrollmentWarning` returns undefined for courses without warnings
- `getSectionsForCourse` returns sections for an offered course
- `getSectionsForCourse` returns empty array for unknown course

---

## Priority 2: Export Logic (Critical for Data Integrity)

### 2A. `export.ts` - `exportToCSV` (0% covered)

At `src/services/export.ts:23-81`. The CSV generation logic is testable if you separate content generation from DOM/download operations. Currently `exportToCSV` mixes CSV string building with `document.createElement` / `link.click()`. The CSV content building (lines 24-65) could be extracted into a pure function and tested separately.

**Recommended approach:**
- Extract the CSV string building into a `buildCSVContent(studentData): string` function
- Test round-trip: `buildCSVContent` -> `parseCSVImport` produces equivalent data
- Test CSV escaping: values with commas, quotes, newlines
- Test edge cases: empty name, no courses, no special credits

### 2B. `export.ts` - `escapeCSV` / `unescapeCSV` (0% covered, internal)

At `src/services/export.ts:171-184`. These are private helpers but critical for data integrity. The round-trip test above would implicitly cover them, but direct tests would catch edge cases:

- Strings containing commas
- Strings containing double quotes
- Strings containing newlines
- Strings with no special characters (no escaping needed)

### 2C. `export.ts` - `generatePdfBlob` (0% covered)

At `src/services/export.ts:192-745`. This is a ~550-line function that generates the full PDF document. While it's heavily coupled to jsPDF, the business logic inside it (computing category statuses, building overflow lists, organizing scheduled courses by category) duplicates logic from `useRequirements` and `ReviewSummaryStep`.

**Recommended approach:**
- Extract the data preparation logic (lines 262-360, computing `scheduledByCategory`, `allCategories`, overflow, etc.) into a shared pure function
- Test that shared function directly
- The PDF rendering itself (jsPDF calls) is lower priority for unit tests but could benefit from snapshot testing of the blob output

---

## Priority 3: React Hooks

### 3A. `useWizardFlow.ts` (0% covered)

At `src/hooks/useWizardFlow.ts:58-195`. This hook manages wizard navigation, step filtering by degree type, and dynamic step list generation. It's testable with `renderHook`.

**Recommended tests:**
- Major vs minor produces different step lists (major includes intro, dcElective, daElective steps)
- Navigation: `goNext` / `goBack` / `goToStep` / `goToStepId` change the current step
- `goNext` does nothing at the last step; `goBack` does nothing at the first step
- `progress` returns 0 at start and 100 at end
- `reset` returns to step 0 and clears unmet categories
- Setting unmet categories adds schedule steps and a transition step
- `partLabel` changes based on the current step's part
- Steps without unmet categories skip the transition step

### 3B. `useStudentData.ts` (0% covered)

At `src/hooks/useStudentData.ts:18-145`. This hook manages localStorage persistence and provides CRUD operations for student data. Testable with `renderHook` and a mocked `localStorage`.

**Recommended tests:**
- Initializes with defaults when localStorage is empty
- Loads saved data from localStorage on init
- `updateStudentData` merges partial updates
- `setCompletedCourse` doesn't duplicate existing courses
- `removeCompletedCourse` removes the correct course
- `addScheduledCourse` / `removeScheduledCourse` work correctly
- `addSpecialCredit` generates unique IDs
- `removeSpecialCredit` removes by ID
- `setCourseCategory` updates the category map
- `resetStudentData` clears data and localStorage
- `importStudentData` merges imported data correctly
- Handles localStorage errors gracefully (corrupted JSON)

---

## Priority 4: Component Tests

### 4A. `CourseStep.tsx` (0% covered)

At `src/components/wizard/steps/CourseStep.tsx`. This is the most complex component (387 lines) with two modes: single-select (radio) and multi-select (checkbox). It has significant rendering logic around course filtering, mutual exclusion, search, and category grouping.

**Recommended tests:**
- Single-select mode: renders radio buttons, calls `onSelectCourse` on selection
- Multi-select mode: renders checkboxes, calls `onSelectCourse`/`onDeselectCourse`
- "Not yet" button calls `onSelectNotYet`
- Search filtering works (type in search, courses filter)
- Mutually excluded courses are hidden
- Info dialog opens and displays course details
- DC/DA elective badges ("Elective" vs "Gen Elective") render correctly

### 4B. `ReviewSummaryStep.tsx` (0% covered)

At `src/components/wizard/steps/ReviewSummaryStep.tsx`. Renders the degree progress summary. Would benefit from integration-style tests verifying correct categorization and display.

**Recommended tests:**
- Renders completed courses in the correct categories
- Renders scheduled courses
- Shows remaining course count
- Dual progress bars show correct percentages
- Semester plan grid renders

### 4C. Other Step Components (0% covered)

`WelcomeStep`, `NameStep`, `GraduationStep`, `SpecialCreditsStep`, `TransitionStep`, `ReviewActionsStep` - these are simpler form components. Lower priority but still worth basic render + interaction tests.

---

## Priority 5: App-Level Integration

### 5A. `App.tsx` (0% covered)

At `src/App.tsx`. This 810-line file is the application orchestrator. It wires together all hooks and components, manages cross-step state, handles CSV import routing, and coordinates the Part 1 -> Part 2 transition. It's the highest-complexity file and the hardest to test in isolation.

**Recommended approach:**
- Extract `calculateUnmetCategories` (lines 288-332) into a utility function and test it directly - it's pure logic
- Extract `canProceed` logic into a testable function
- Consider a few integration tests using `render(<App />)` to verify key user flows:
  - Start wizard, enter name, select degree type, advance through steps
  - CSV import navigates to the correct step
  - "Start Over" resets all state

---

## Suggested Refactoring to Improve Testability

1. **Extract `buildCSVContent` from `exportToCSV`** - Separate CSV string generation from DOM download logic so the content can be unit tested.

2. **Extract PDF data preparation from `generatePdfBlob`** - The ~100 lines of category processing, overflow computation, and `scheduledByCategory` building duplicate logic in `ReviewSummaryStep` and `useRequirements`. A shared function would reduce duplication and be independently testable.

3. **Extract `calculateUnmetCategories` from `App.tsx`** - This is pure logic that lives inside a `useCallback` in a React component. Moving it to a utility module makes it directly testable.

4. **Extract `canProceed` validation from `App.tsx`** - The step validation logic at lines 248-285 could be a pure function `canProceedFromStep(step, studentData, selections, ...): boolean`.

---

## Quick Wins (Highest ROI for Minimal Effort)

| Test Target | Effort | Impact | Why |
|---|---|---|---|
| `getSemestersUntilGraduation` | Low | High | Pure function, core planning logic |
| `buildSemesterPlan` | Low | High | Pure function, complex distribution algorithm |
| `getCapstoneTargetSemester` | Low | Medium | Pure function, 10 lines |
| `exportToCSV` round-trip | Medium | High | Data integrity for save/load cycle |
| `useWizardFlow` navigation | Medium | High | Step flow correctness |
| `useStudentData` CRUD | Medium | Medium | Data persistence correctness |
| `CourseStep` render modes | Medium | Medium | Most complex UI component |
