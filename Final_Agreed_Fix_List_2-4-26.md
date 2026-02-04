# Final Agreed Fix List (2-4-26)

This list reflects the issues both AIs agree are valid and worth fixing.

1. Add ARIA semantics to the degree type selector in `NameStep.tsx` (single-select group), e.g., `role="radiogroup"` on the container and `aria-pressed` on each button. Refs: `src/components/wizard/steps/NameStep.tsx:47`.
2. Add an app-level React Error Boundary (resilience enhancement; prevents total wizard crash). Refs: `src/main.tsx:6`.
3. Fix malformed entries in `data/offerings-sp26.json` where `schedule`/`modality`/`status` fields are swapped. Refs: `data/offerings-sp26.json:106`, `data/offerings-sp26.json:133`, `data/offerings-sp26.json:178`.
4. Hide the Print button on mobile or add a mobile-safe fallback for `printPdf()` (known limitation, low severity). Refs: `src/components/wizard/steps/ReviewActionsStep.tsx:194`, `src/services/export.ts:765`.
5. Extend or redesign print blob URL revocation so the URL isn’t revoked while the print dialog is open (current 10s timeout is risky). Refs: `src/components/wizard/steps/ReviewActionsStep.tsx:110`.
6. If dark mode is supported, update `InstallPrompt.tsx` to use theme tokens instead of hard-coded light colors. Refs: `src/components/InstallPrompt.tsx:30`.
