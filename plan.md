# Implementation Plan: Ideaflow System Completion

This plan outlines the steps to transition the Ideaflow prototype from static mock data to a functional frontend application with local persistence.

## Phase 1: State Management & Persistence
Currently, the app uses static constants (`MOCK_PROPOSALS`, `CURRENT_USER`). We need to move this to a mutable state.

- [x] **Create Global Store (Context API)**
    - [x] Create `ProposalContext` to manage proposals, users, and mileage logs.
    - [x] Initialize state from `localStorage` if available, otherwise use `constants.ts` data.
    - [x] Create `AuthProvider` to manage `CURRENT_USER` (allow switching users for testing).

- [x] **Refactor Components to Use Store**
    - [x] Update `Dashboard.tsx` to consume context data.
    - [x] Update `ProposalSubmit.tsx` to dispatch "add proposal" actions.
    - [x] Update `Evaluation.tsx` and `DeptReview.tsx` to dispatch "update status" actions.
    - [x] Update `Rewards.tsx` to read dynamic mileage logs.

## Phase 2: Feature Implementation
Implement the actual logic for the features that are currently UI-only.

- [x] **Proposal Submission Flow**
    - [x] Implement `handleSubmit` in `ProposalSubmit.tsx`.
    - [x] Validate input fields.
    - [x] Generate unique ID and timestamp.
    - [x] Add to global state and redirect to Dashboard.

- [x] **Review Process Logic**
    - [x] Implement "Approve/Reject" logic in `DeptReview.tsx`.
    - [x] Implement "Grading" logic in `Evaluation.tsx` (calculate scores, assign grades).
    - [x] Update proposal status based on actions (e.g., `New` -> `Dept_Review` -> `1st_Review`).

- [x] **Settings & Configuration**
    - [x] Persist notification settings and mileage rules in `Settings.tsx`.
    - [x] Apply mileage rules dynamically when calculating points.

## Phase 3: UI/UX Enhancements
Improve the user experience with better feedback.

- [x] **Toast Notifications**
    - [x] Replace `alert()` calls with a proper Toast component (e.g., `sonner` or custom).
    - [x] Show success messages on submission/saving.

- [x] **Data Visualization**
    - [x] Ensure charts in `Dashboard.tsx` reflect real-time data from the store.
    - [x] Add "My Proposals" list for general users.

## Phase 4: Expansion & Role-Based Features
Focus on separating user roles (Proposer vs Reviewer) and adding depth to the application.

- [ ] **Authentication & User Management**
    - [x] Create a `Login` page (replace hardcoded user).
    - [x] Implement `AuthProvider` with role support (`User`, `Reviewer`, `Admin`).
    - [ ] Protect routes based on roles (e.g., only Reviewers can access `Evaluation`).
    - [x] **Role-Based UI**:
        - [x] **Sidebar**: Hide "Evaluation", "Dept Review", "Settings" for regular users.
        - [x] **Dashboard**: Show different widgets based on role (e.g., "My Proposals" for User vs "Pending Reviews" for Reviewer).

- [ ] **Proposal Detail View**
    - [ ] Create `ProposalDetail.tsx` (read-only view for proposers).
    - [ ] Show full history/timeline of the proposal.
    - [ ] Add "Comments" section for feedback.

- [ ] **Public Proposal List**
    - [ ] Create `ProposalList.tsx` for browsing all public proposals.
    - [ ] Add filter/sort options (by category, date, status).
    - [ ] Add "Search" functionality.

- [ ] **My Page / Profile**
    - [ ] Create `Profile.tsx`.
    - [ ] Display user stats (Total Proposals, Total Mileage, Adoption Rate).
    - [ ] Show detailed mileage history with filter options.

## Phase 5: Admin & System Hardening
Features for system administrators and overall stability.

- [ ] **Admin Dashboard**
    - [ ] User Management (Add/Edit/Delete users).
    - [ ] Department Management (Add/Edit departments).
    - [ ] System Logs (Track important actions).
    - [ ] **SSO Integration (KT BizOffice)**
        - [ ] Analyze KT BizOffice SSO API/Protocol (SAML/OAuth/Token).
        - [ ] Implement `SSOAuthProvider` to handle external tokens.
        - [ ] Map groupware user data (Dept, Role) to local users.

- [ ] **Search & Archive**
    - [ ] Implement global search (by title, proposer, department).
    - [ ] Add "Archive" view for old/completed proposals.

- [ ] **Data Export**
    - [ ] Implement Excel/CSV export for proposals and mileage logs.

## Phase 6: Advanced Workflow & Engagement (Deep Dive)
Features to drive sustained usage and handle complex real-world scenarios.

- [ ] **Collaboration & Feedback Loop**
    - [ ] **Comment System**: Threaded discussions on proposals (ask questions, provide feedback).
    - [ ] **Mentions**: `@user` tagging to notify specific people.
    - [ ] **Co-Authorship**: Allow multiple users to edit/submit a single proposal.

- [ ] **Advanced Lifecycle Management**
    - [ ] **Return for Modification**: Instead of simple Rejection, allow reviewers to send back for edits.
    - [ ] **Post-Implementation Tracking**: Track *actual* ROI 3/6/12 months after implementation.
    - [ ] **Duplicate Detection**: Suggest similar existing ideas during submission to prevent duplicates.

- [ ] **Gamification & Culture**
    - [ ] **Leaderboards**: "Idea King of the Month", "Top Department".
    - [ ] **Hall of Fame**: Showcase best practices with before/after photos.
    - [ ] **Badges**: Achievements (e.g., "First S-Grade", "10 Proposals").

- [ ] **Mobile Experience**
    - [ ] **PWA Support**: Make the app installable on mobile devices.
    - [ ] **Mobile-First Submission**: Optimized flow for submitting photos/ideas on the go.

## Verification Plan
- **Manual Testing**:
    1.  **Submit Proposal**: Create a new proposal and verify it appears on the Dashboard.
    2.  **Review Flow**: Log in as a reviewer, approve the proposal, and verify status change.
    3.  **Settings**: Change mileage rules, save, reload page, and verify settings persist.
