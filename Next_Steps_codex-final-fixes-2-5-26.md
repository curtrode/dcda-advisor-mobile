# Next Steps — codex/final-fixes-2-5-26

## Current State
- Branch: `codex/final-fixes-2-5-26`
- Changes implemented:
  1. ARIA semantics for degree type selector in `NameStep.tsx`.
  2. Mobile print handling: Print button hidden on mobile; `printPdf` cleanup tied to print lifecycle.
  3. Fixed swapped fields in `data/offerings-sp26.json` (GEOL 20113, HIST 30693, MATH 10043).
  4. Removed 10s print blob URL revoke; now revokes on print lifecycle.

## Decisions Needed
- Offerings data: keep the `01/12/26` value in `enrollment` (current) or drop it / map it elsewhere.
- Mobile print: confirm that hiding the Print button on mobile is acceptable vs. adding a mobile-safe fallback.

## Verification
- Manual UI check: Degree type selector still toggles correctly and is announced as a single-select group.
- Manual schedule view: Offerings display correctly for GEOL/HIST/MATH entries.
- Manual print (desktop): Print opens, prints, and blob URL is revoked after closing print dialog.

## Tooling
- Lint: `npm run lint` currently fails due to pre-existing issues in `src/components/ui/button.tsx` and `src/services/courses.test.ts` (unrelated to this branch).

## Next Actions (once decisions are confirmed)
1. Adjust offerings data if needed.
2. Commit changes on this branch.
3. Open PR / request review.
