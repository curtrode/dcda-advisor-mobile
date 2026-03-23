# Ada — AI-Powered Degree Planning for DCDA Students

**Live:** [dcda.digitcu.org](https://dcda.digitcu.org)

## The Problem

Academic advising at scale is a bottleneck. Students in TCU's Digital Culture & Data Analytics program navigate a web of requirements — core courses, electives, mutually exclusive options, prerequisite chains, and semester-specific offerings — that changes every term. Advisors spend significant time on mechanical degree audits rather than mentoring. Students make scheduling mistakes that delay graduation.

## The Solution

Ada is a mobile-first advising tool that combines a structured degree-planning wizard with a context-aware AI chat assistant. It addresses both sides of the advising relationship:

- **For students:** A self-service wizard that walks through completed coursework, validates requirements, builds a semester-by-semester plan through graduation, and provides an AI assistant that can answer questions about courses, careers, and degree progress — available 24/7.
- **For advisors:** Pre-built degree plans submitted via PDF or email, reducing mechanical audit time and freeing capacity for higher-value mentoring conversations.

## How AI Is Used

Ada integrates an AI chat assistant powered by [Sandra](https://github.com/TCU-DCDA/advisor-chat), a shared backend serving the broader [AddRan Advising Ecosystem](https://github.com/curtrode/ecosystem-docs).

The AI layer is not a generic chatbot bolted onto a form. It receives **live context** from the wizard — the student's completed courses, remaining requirements, progress percentage, scheduled courses, and current semester offerings — and uses this to provide personalized, grounded responses.

**What students can ask Ada:**
- "What should I take next semester?" — Ada knows what's left, what's offered, and what has prerequisites
- "Am I on track to graduate?" — Ada sees real-time progress against Major or Minor requirements
- "What careers align with my coursework?" — Ada references program-specific career paths and contacts
- "Tell me about the Data Science minor" — Ada can surface related programs with structured detail

**How it works under the hood:**
1. The wizard generates an **advising manifest** — a structured JSON document containing the full course catalog, requirements, career options, and current offerings
2. Sandra consumes this manifest as its knowledge base, ensuring responses are grounded in actual program data rather than general training knowledge
3. A **context builder** translates the student's live wizard state into a natural-language narrative sent with each query
4. Student feedback (thumbs up/down) is collected per response to monitor quality

This architecture means the AI can be honest about what it doesn't know and accurate about what it does — because its knowledge is scoped to verified, program-specific data.

## Key Features

### Degree Planning Wizard
- **Four-phase flow:** History (completed courses) → Schedule (upcoming semester) → Review (progress dashboard + graduation plan) → Submit (PDF/CSV/email export)
- Handles Major (33 hours) and Minor (21 hours) with distinct logic paths
- Enforces mutually exclusive courses, prerequisite chains, and elective overflow rules
- Generates multi-semester plans calibrated to expected graduation date
- Optional summer term scheduling with automatic capstone placement

### Admin Panel
- Firebase-backed interface for program staff to manage semester offerings, course data, and advising notes
- Changes propagate to the AI's knowledge base via manifest regeneration

### Privacy and Accessibility
- All student data stored locally in the browser — no student PII touches a server
- Progressive Web App (PWA) — installable on mobile, works offline
- Mobile-first responsive design

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Student Device (Browser / PWA)                         │
│  ┌──────────────────┐  ┌─────────────────────────────┐  │
│  │  Wizard Engine    │──│  Ada Chat Panel             │  │
│  │  (React/TS)       │  │  (contextual AI assistant)  │  │
│  │                   │  │                             │  │
│  │  localStorage     │  │  Sandra API ───────────┐    │  │
│  └──────────────────┘  └─────────────────────────│───┘  │
│            │                                     │      │
│            ▼                                     ▼      │
│  ┌──────────────────┐              ┌─────────────────┐  │
│  │  Export Service   │              │  Feedback Loop  │  │
│  │  (PDF/CSV/Email)  │              │  (ratings → CF) │  │
│  └──────────────────┘              └─────────────────┘  │
└─────────────────────────────────────────────────────────┘
         │                                     │
         ▼                                     ▼
┌──────────────────┐              ┌─────────────────────┐
│  Advisor Inbox   │              │  Sandra Backend     │
│  (email/PDF)     │              │  (Cloud Functions)  │
└──────────────────┘              │  + Advising Manifest│
                                  └─────────────────────┘
                                           │
                                           ▼
                                  ┌─────────────────────┐
                                  │  Admin Panel        │
                                  │  (Firebase/Firestore)│
                                  └─────────────────────┘
```

## Project Structure

```text
src/
├── components/
│   ├── ui/              # Reusable UI components (shadcn/ui)
│   └── wizard/          # Core advising flow
│       ├── steps/       # Individual wizard screens
│       ├── AdaPanel.tsx # AI chat assistant interface
│       └── WizardShell.tsx
├── hooks/               # State management and business logic
│   ├── useStudentData   # Student progress state
│   ├── useRequirements  # Degree requirement engine
│   └── useWizardFlow    # Step sequencing logic
├── services/            # Export, analytics, Firebase integration
├── admin/               # Staff-facing admin panel
├── lib/                 # Utilities (context builder, helpers)
└── types/               # TypeScript interfaces
data/
├── courses.json         # Full DCDA course catalog
├── requirements.json    # Degree requirement rules
├── offerings-*.json     # Per-semester course offerings
├── career-options.json  # Career paths by program
└── contacts.json        # Department contacts
schemas/
└── manifest.schema.json # Advising manifest schema (v1.0)
```

## Technical Stack

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS v4
- **AI Backend:** Sandra (Cloud Functions) with structured advising manifest
- **Data:** Firebase (Firestore for admin, localStorage for students)
- **Deployment:** Firebase Hosting with CI/CD (GitHub Actions)
- **Testing:** Vitest + React Testing Library
- **PWA:** Vite PWA plugin with service workers

## Ecosystem Integration

This wizard is one component of the [AddRan Advising Ecosystem](https://github.com/curtrode/ecosystem-docs). It publishes a standardized advising manifest that Sandra consumes, enabling the same AI backend to serve multiple department wizards with program-specific knowledge.

```bash
npm run generate-manifest   # Build the advising manifest
npm run check-schema        # Validate schema version against source of truth
```

## Getting Started

```bash
npm install        # Install dependencies
npm run dev        # Start development server
npm run build      # Production build (includes manifest generation)
npm test           # Run test suite
```

Requires Node.js v18+ and a `.env` file (see `.env.example`).

## License

MIT — see [LICENSE](LICENSE).
