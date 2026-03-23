# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
