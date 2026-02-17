# DCDA Advisor Mobile - Application Flow Chart

## High-Level Application Flow

```mermaid
flowchart TD
    subgraph START["🚀 Application Start"]
        A[App Launch] --> B{Existing Data<br/>in localStorage?}
        B -->|Yes| C[Load Saved Data]
        B -->|No| D[Initialize Empty State]
        C --> E[Welcome Step]
        D --> E
    end

    subgraph PHASE1["📋 History: Record Completed Courses"]
        E --> F{CSV File<br/>Imported?}
        F -->|Yes| G[Parse CSV &<br/>Populate Selections]
        F -->|No| H[Name & Degree Type]

        G --> I{Unmet Categories<br/>Exist?}
        I -->|Yes| TRANS
        I -->|No| REV

        H --> J{Major or Minor?}
        J -->|Major| K[Expected Graduation]
        J -->|Minor| K

        K --> L[Intro/Required English]
        L --> M{Course Selected<br/>or Not Yet?}
        M -->|Selected| N[Mark Intro Complete]
        M -->|Not Yet| O[Mark Intro Unmet]

        N --> P[Statistics]
        O --> P

        P --> Q{Course Selected<br/>or Not Yet?}
        Q -->|Selected| R[Mark Stats Complete]
        Q -->|Not Yet| S[Mark Stats Unmet]

        R --> T[Coding]
        S --> T

        T --> U{Course Selected<br/>or Not Yet?}
        U -->|Selected| V[Mark Coding Complete]
        U -->|Not Yet| W[Mark Coding Unmet]

        V --> X[Multimedia Authoring]
        W --> X

        X --> Y{Course Selected<br/>or Not Yet?}
        Y -->|Selected| Z[Mark MM Complete]
        Y -->|Not Yet| AA[Mark MM Unmet]
    end

    subgraph ELECTIVES["📚 Electives (Majors Only)"]
        Z --> AB{Is Major?}
        AA --> AB
        AB -->|Yes| AC[DC Electives<br/>Multi-Select]
        AB -->|No| AH[Special Credits]

        AC --> AD[DA Electives<br/>Multi-Select]
        AD --> AE{Calculate<br/>Elective Overflow}
        AE --> AF[1st DC → DC Req<br/>Extra → General]
        AF --> AG[1st DA → DA Req<br/>Extra → General]
        AG --> AH
    end

    subgraph SPECIAL["🎓 Special Credits"]
        AH --> AI{Add Special<br/>Credits?}
        AI -->|Yes| AJ[Transfer/Study Abroad/<br/>One-Time Approval]
        AI -->|No| AK[Calculate Unmet<br/>Categories]
        AJ --> AK
    end

    subgraph TRANSITION["🔄 TRANSITION"]
        AK --> TRANS{Any Unmet<br/>Requirements?}
        TRANS -->|Yes| AL[Show Summary<br/>of Completed]
        TRANS -->|No| REV

        AL --> AM{Include Summer<br/>Terms?}
        AM -->|Toggle| AN[Update Semester<br/>Planning]
        AN --> AO[Begin Part 2<br/>Scheduling]
    end

    subgraph PHASE2["📅 Schedule: Plan Remaining Courses"]
        AO --> AP{Next Unmet<br/>Category?}

        AP -->|Intro| AQ[Schedule Intro<br/>Course]
        AP -->|Stats| AR[Schedule Stats<br/>Course]
        AP -->|Coding| AS[Schedule Coding<br/>Course]
        AP -->|MM Auth| AT[Schedule MM<br/>Course]
        AP -->|DC Elective| AU[Schedule DC<br/>Elective]
        AP -->|DA Elective| AV[Schedule DA<br/>Elective]
        AP -->|General| AW[Schedule General<br/>Elective]
        AP -->|Capstone| AX[Auto-Schedule<br/>Capstone]
        AP -->|None Left| REV

        AQ --> AY{Select or Skip?}
        AR --> AY
        AS --> AY
        AT --> AY
        AU --> AY
        AV --> AY
        AW --> AY

        AY -->|Select Course| AZ[Add to<br/>Scheduled Courses]
        AY -->|Skip| BA[Mark as<br/>Skipped]

        AZ --> AP
        BA --> AP
        AX --> REV
    end

    subgraph REVIEW["✅ Review & Submit"]
        REV[Review Summary]
        REV --> BB[Build Semester<br/>Distribution Plan]
        BB --> BC[Display Progress<br/>Bars & Summary]
        BC --> BD{Export?}
        BD -->|PDF| BE[Generate PDF]
        BD -->|CSV| BF[Generate CSV]
        BD -->|No| BG{Start Over?}
        BE --> BG
        BF --> BG
        BG -->|Yes| BH[Clear All Data]
        BG -->|No| BI[End]
        BH --> E
    end
```

## Degree Type Decision Tree

```mermaid
flowchart TD
    A[Degree Type<br/>Selection] --> B{Major or Minor?}

    B -->|MAJOR| C[Required Categories]
    B -->|MINOR| D[Required Categories]

    C --> E[Intro/Required English ✓]
    C --> F[Statistics ✓]
    C --> G[Coding ✓]
    C --> H[MM Authoring ✓]
    C --> I[Capstone ✓]
    C --> J[DC Elective ✓]
    C --> K[DA Elective ✓]
    C --> L[4 General Electives]

    D --> M[Statistics ✓]
    D --> N[Coding ✓]
    D --> O[MM Authoring ✓]
    D --> P[Capstone ✓]
    D --> Q[3 General Electives]

    style E fill:#e1f5fe
    style J fill:#e1f5fe
    style K fill:#e1f5fe
    style L fill:#e1f5fe
```

## Course Selection Validation Logic

```mermaid
flowchart TD
    A[User Selects<br/>Course] --> B{Is Course<br/>Mutually Exclusive?}

    B -->|Yes| C{Conflicting Course<br/>Already Selected?}
    B -->|No| D{Has Enrollment<br/>Warning?}

    C -->|Yes| E[❌ Block Selection<br/>Show Conflict]
    C -->|No| D

    D -->|Yes| F[⚠️ Show Warning<br/>Contact Info]
    D -->|No| G[✅ Allow Selection]

    F --> G

    G --> H{Is Flexible<br/>Course?}
    H -->|Yes| I[Prompt: Which<br/>Category?]
    H -->|No| J[Auto-Assign<br/>to Category]

    I --> K[DC Elective]
    I --> L[DA Elective]
    I --> M[General Elective]

    K --> N[Save Selection]
    L --> N
    M --> N
    J --> N
```

## Capstone Prerequisites Logic

```mermaid
flowchart TD
    A[Check Capstone<br/>Eligibility] --> B{Statistics<br/>Completed/Scheduled?}

    B -->|No| C[❌ Capstone<br/>Not Available]
    B -->|Yes| D{Coding<br/>Completed/Scheduled?}

    D -->|No| C
    D -->|Yes| E[✅ Capstone<br/>Available]

    E --> F[Schedule to<br/>Spring Semester]
    F --> G{Is Graduation<br/>Spring?}

    G -->|Yes| H[Schedule in<br/>Graduation Semester]
    G -->|No| I[Schedule in<br/>Spring Before Grad]
```

## General Electives Calculation

```mermaid
flowchart TD
    A[Calculate General<br/>Electives Needed] --> B{Degree Type?}

    B -->|Major| C[Required: 4]
    B -->|Minor| D[Required: 3]

    C --> E[Count Filled Slots]
    D --> E

    E --> F[+ Explicit General<br/>Selections]
    F --> G[+ DC Elective<br/>Overflow]
    G --> H[+ DA Elective<br/>Overflow]
    H --> I[+ Special Credits<br/>Count]

    I --> J{Filled >= Required?}

    J -->|Yes| K[✅ General Electives<br/>Complete]
    J -->|No| L[❌ Mark as Unmet<br/>Need More]

    L --> M[Add to Part 2<br/>Scheduling]
```

## Semester Distribution Algorithm

```mermaid
flowchart TD
    A[Build Semester<br/>Plan] --> B[Get Current<br/>Semester]
    B --> C[Get Graduation<br/>Semester]

    C --> D{Include<br/>Summers?}
    D -->|Yes| E[Generate All<br/>Semesters]
    D -->|No| F[Generate Fall/Spring<br/>Only]

    E --> G[Place Scheduled<br/>Courses in S1]
    F --> G

    G --> H[Reserve Capstone<br/>for Spring]
    H --> I[Calculate Remaining<br/>Slots per Semester]

    I --> J[Distribute Unmet<br/>Categories Evenly]
    J --> K{Capstone Semester<br/>Overloaded?}

    K -->|Yes| L[Cap at 2 Courses<br/>Move Others Earlier]
    K -->|No| M[Finalize Plan]

    L --> M
    M --> N[Return Semester<br/>Distribution]
```

## Data Persistence Flow

```mermaid
flowchart LR
    subgraph USER_ACTIONS["User Actions"]
        A[Select Course]
        B[Mark Not Yet]
        C[Add Special Credit]
        D[Schedule Course]
    end

    subgraph STATE_UPDATE["State Update"]
        E[updateStudentData]
        F[setCategorySelections]
        G[setNotYetSelections]
        H[setScheduledSelections]
    end

    subgraph PERSISTENCE["Persistence"]
        I[localStorage<br/>dcda-mobile-student-data]
    end

    A --> E
    B --> G
    C --> E
    D --> H

    E --> I
    F --> I
    G --> I
    H --> I

    I -->|Page Reload| J[Restore State]
```

---

## Legend

| Symbol | Meaning |
|--------|---------|
| 📋 | History - Recording completed courses |
| 📅 | Schedule - Planning remaining requirements |
| ✅ | Review & Submit |
| ✓ | Required for degree |
| ❌ | Blocked/unavailable |
| ⚠️ | Warning/caution |

## Key Decision Points Summary

1. **Degree Type** → Determines which steps appear and requirements count
2. **Course Selection vs Not Yet** → Determines if category goes to Part 2
3. **CSV Import** → Can skip Part 1 entirely
4. **Elective Overflow** → Extra electives auto-fill general elective slots
5. **Capstone Prerequisites** → Must have stats + coding before capstone
6. **Summer Toggle** → Affects how courses distributed across semesters
