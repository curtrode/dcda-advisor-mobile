# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- **Manifest generator now reads offerings from Firestore.** `scripts/generate-manifest.js` uses `firebase-admin` + Application Default Credentials to pull every `dcda_config/offerings_*` doc directly, replacing the `findLatestOfferings()` reader that picked only the single chronologically-latest `data/offerings-*.json` file and silently ignored the rest. Any Admin UI edit now reaches Sandra on the next `npm run build`, with no manual JSON export step.
  - **`npm run build` now requires ADC.** If the build fails with a credential error, run `gcloud auth application-default login` on the build machine.
  - CI/CD that doesn't have ADC will need a service account JSON and `GOOGLE_APPLICATION_CREDENTIALS` set. Local dev with `firebase login` already sharing the Google account works out of the box.
- **`highlightedCourses` is now an array of `{term, courses}` objects**, one entry per upcoming term, rather than a single term object. This lets Sandra surface Summer + Fall offerings at the same time instead of only the single "latest" term. The wizard schema accepts both shapes via `oneOf` for backward compatibility during rollout.
- **Term filter** now selects offerings whose start date is in the future (sp → Jan 15, su → May 20, fa → Aug 20). Sandra is forward-looking — students with current-semester questions use the live wizard UI, not the chatbot.
- **Term labels** are now derived from the offerings doc ID (`offerings_sp26` → "Spring 2026") instead of the doc's user-editable `term` field. The `term` field has been observed to drift: `offerings_sp26` in Firestore currently has `term: "Fall 2026"` from a stale template copy.
- **CI fallback for generate-manifest.** When the Firestore fetch fails AND `process.env.CI === 'true'` AND a committed `public/advising-manifest.json` exists, the script logs a warning and exits 0 instead of failing the build. GitHub Actions (and most CI providers) don't have Application Default Credentials, and it's impractical to hand out Firestore-read service accounts to CI. The contract is: **run `npm run generate-manifest` locally and commit the regenerated manifest before pushing content changes** — CI then deploys the committed file as-is. Local builds without ADC still fail hard with the `gcloud auth application-default login` instructions.

### Removed

- Dead code: the `offeredCodes` set and `sectionLookup` map in `generate-manifest.js` were initialized from the old single-offerings object but never consulted.
- `scripts/generate-manifest.js` no longer reads `data/offerings-*.json`. The static files remain in the repo for now as historical snapshots; they can be retired in a follow-up once the Firestore path is confirmed stable.

## [1.0.0] - 2026-03-22

Initial versioned release of the DCDA Advising Wizard ("Ada").

### Features
- Multi-step degree planning wizard for DCDA majors and minors
- PDF export of semester plans for advisor review
- Ada AI chat panel powered by Sandra API
- Admin page with Firebase backend for managing offerings
- Course frequency tracking and analytics
- PWA support with offline capabilities
- Prioritized course suggestions based on offerings
- Special credits mapping to specific requirements
- Email fallback for students without mail clients
- General electives step for minors

### Infrastructure
- Firebase Hosting deployment with CI/CD
- AddRan Advising Ecosystem manifest integration (schema v1.0)
- Automated schema version checking against source-of-truth
- Vite build with manual chunk splitting
- Vitest test suite with smoke tests
