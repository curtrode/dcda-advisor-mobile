# UX Review: DCDA Advisor Mobile App

**Date:** January 18, 2026
**Reviewer:** GitHub Copilot

## Executive Summary
The DCDA Advisor app provides a solid, logical flow for students to track their progress and plan future semesters. However, several friction points exist that may cause confusion, particularly during the transition between "History" and "Scheduling" phases, and when managing long lists of courses.

## Detailed Findings

### 1. Navigation & Flow
*   **Linear Rigidity**: The current wizard enforces a strict linear progression. While necessary for data dependencies, the inability to jump back to a specific previous step via the `StepIndicator` is a usability hurdle. Users must click "Back" repeatedly.
*   **The "Phase 2" Surprise**: There is a jarring transition between checking off completed requirements and scheduling new ones.
    *   *Issue*: After the "Special Credits" step, the user is immediately dropped into "Schedule: Statistics" (or similar) without context.
    *   *Risk*: Students may think they are still indicating what they *have done*, rather than what they *want to do*.
*   **Lack of Introduction**: The Welcome screen is privacy-focused but lacks a "How this works" overview (e.g., "First we check your history, then we plan your release").

### 2. Course Selection (CourseStep)
*   **Searchability**:
    *   *Issue*: The "General Electives" and "Digital Culture Elective" lists can be very long.
    *   *Friction*: There is no text search. Users must scroll through potential dozens of options.
*   **Comparison**: When selecting a course, users only see the title. They cannot easily compare prerequisites or descriptions without clicking "Info" for each one individually.

### 3. Special Credits (SpecialCreditsStep)
*   **Ambiguity**:
    *   *Issue*: Users are asked "Counts Toward..." with a dropdown of requirement categories.
    *   *Confusion*: A student transferring "CS 101" from a community college might not know if that maps to "Coding" or "Check Sheet Elective" without consulting an advisor.
    *   *Recommendation*: Add helper text: "If unsure, check the 'General / other' category and ask your advisor."

### 4. Scheduling (ScheduleStep)
*   **Summer Term Blind Spot**: The logic currently assumes a standard Fall/Spring cadence. Students checking "Summer 2026" as graduation might find the schedule generation (which looks at `offerings-sp26.json`) confusing or empty if summer data isn't handled explicitly.
*   **"Skip" Visibility**: The "Skip for now" option is good, but could be more prominent to prevent blocking users who are undecided.

## Recommendations for Implementation

1.  **Add Search Filter**: Implement a simple string match filter on `CourseStep` lists.
2.  **Transition Step**: Insert a simple interstitial screen:
    > "Great! Now let's plan your remaining courses. Based on what you've finished, here is what you need to take next."
3.  **Step Navigation**: Make the circles in `StepIndicator` clickable if the step has already been visited ( `index < currentStep`).
4.  **Helper Text**: Enhance `SpecialCreditsStep` with examples.
