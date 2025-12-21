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

## Phase 3.5: OpenProject Deep Integration
Leverage the established connection to enrich the application data.

- [x] **Data Utilization**
    - [x] **Committee Management**: Replace manual input with **Search & Select** from synced OpenProject users in `Settings.tsx`.
    - [x] **Proposal Submission**: Display "Department" automatically based on logged-in user (mapped from OP).

- [x] **Additional Sync (Projects)**
    - [x] **Fetch Projects**: Implement `fetchOpenProjectProjects` API.
    - [x] **Settings UI**: Add "Sync Projects" capability.
    - [x] ~~**Proposal Context**: Allow linking a proposal to a specific OpenProject Project~~ (Cancelled).

- [x] **UI/UX Refinement**
    - [x] **Sync Status Dashboard**: Improve the Settings UI to show detailed sync stats (Total Users, Total Projects, Last Sync Time).
    - [x] **User Avatars**: Display OpenProject avatars where users are listed.

## Phase 4: Expansion & Role-Based Features
Focus on separating user roles (Proposer vs Reviewer) and adding depth to the application.

- [ ] **Authentication & User Management**
    - [x] Create a `Login` page (replace hardcoded user).
    - [x] Implement `AuthProvider` with role support (`User`, `Reviewer`, `Admin`).
    - [x] Protect routes based on roles (e.g., only Reviewers can access `Evaluation`).
    - [x] **Role-Based UI**:
        - [x] **Sidebar**: Hide "Evaluation", "Dept Review", "Settings" for regular users.
        - [x] **Dashboard**: Show different widgets based on role (e.g., "My Proposals" for User vs "Pending Reviews" for Reviewer).

- [x] **Proposal Detail View**
    - [x] Create `ProposalDetail.tsx` (read-only view for proposers).
    - [x] Show full history/timeline of the proposal.
    - [x] Add "Comments" section for feedback.

- [x] **Public Proposal List**
    - [x] Create `ProposalList.tsx` for browsing all public proposals.
    - [x] Add filter/sort options (by category, date, status).
    - [x] Add "Search" functionality.
    - [ ] **Unique Numbering System**: Assign sequential IDs (e.g., PROP-2024-001) during submission to replace random hashes.

- [x] **My Page / Profile**
    - [x] Create `Profile.tsx`.
    - [x] Display user stats (Total Proposals, Total Mileage, Adoption Rate).
    - [x] Show detailed mileage history (via Rewards page).

## Phase 5: Admin & System Hardening
Features for system administrators and overall stability.

- [x] **Admin Dashboard (Settings)**
    - [x] User Management (Add/Edit/Delete/Role Assignment).
    - [x] Department Management (Add/Edit/Delete).
    - [x] Category & Criteria Management (Dynamic configuration).
    - [x] System Logs (Track important actions).

- [x] **Email Notification System (Smart & Scheduled)**
    - [x] **Architecture**: Python-based Email Service (Sidecar/Backend) for reliability.
    - [x] **Management**: SMTP Configuration UI (Settings.tsx).
    - [x] **Template Editor**: UI for customizing email subjects/bodies (New Proposal, Review, Result).
    - [x] **Daily Digest (1일 1회 요약)**:
        - [x] Aggregation Logic: "OOO님, 오늘 처리해야 할 심의가 5건 있습니다." (Implemented in notificationService.ts).
        - [x] Simulation: Manual trigger button in Settings.
    - [x] **Instant Alerts (Event-driven)**:
        - [x] **Core Logic**: `sendInstantNotification` function (Template parsing, Setting check).
        - [x] **Triggers**:
            - [x] New Proposal -> Dept Leader.
            - [x] Dept Pass -> Admin / 1st Reviewers.
            - [x] Final Result -> Proposer.
    - [x] **System Logs**: Record email sending events in System Logs (UI added to Settings).
    - [ ] **Spam Prevention & Preferences**:
        - [ ] **Admin Rules**: Default to "Daily Digest Only" or "System Errors Only" (Prevent inbox flooding).
        - [x] **User Preferences**: Allow users to toggle [Instant / Daily / None] in My Page.
    - [x] **SSO Integration (KT BizOffice)**
        - [x] Skipped (User Request: Login already implemented).

- [x] **Search & Archive** (Covered by Admin Proposal Management)
    - [x] Archive view for old/completed proposals (Admin Proposals page).
    - [x] Search functionality in proposal lists.

- [x] **Data Export** ✅
    - [x] Implement Excel/CSV export for proposals (Admin Proposals page).
    - [x] Implement Excel/CSV export for mileage logs (Rewards page).

## Phase 7: Reporting & Analytics ✅
Visualizing key performance indicators.

- [x] **Statistics Dashboard (Report Page)** - Already implemented!
    - [x] **Filters**: Date Range Picker with Presets (Monthly, Quarterly, Fiscal, Custom).
    - [x] **Key Metrics**:
        - [x] Total Proposals Count.
        - [x] Adoption Rate (Completed / Total).
        - [x] Participation Rate (Proposals per Dept/User).
    - [x] **Charts**: Bar/Line/Pie charts using recharts.
    - [x] **AI Insight**: Gemini-powered analysis button.

## Phase 8: AI Integration (Gemini Co-pilot) ✅
Transforming the system into an active assistant using personal API keys.

- [x] **AI Infrastructure** - Already implemented!
    - [x] `services/aiService.ts`: Gemini SDK wrapper (`@google/generative-ai`).
    - [x] **Key Management**: UI in `Profile.tsx` to save API Key to localStorage.
    - [x] **Model Selection**: Multiple models support (flash/pro/exp).
    - [x] **Context Engine**: checkDuplicates compares with existing proposals.

- [x] **Feature Implementation** - Already implemented!
    - [x] **Writer Support**: `refineDraft` for enhancing drafts, `checkDuplicates` for similarity check.
    - [x] **Reviewer Support**: `analyzeProposal` (1st), `analyze2ndRound` (2nd) with scoring guidelines.
    - [x] **Report Support**: `generateReportInsight` for AI-powered analytics.


## Phase 9: Advanced Workflow & Engagement (Deep Dive)
Features to drive sustained usage and handle complex real-world scenarios.

- [x] **Collaboration & Feedback Loop**
    - [x] **Comment System**: Threaded discussions on proposals (ask questions, provide feedback).
    - [x] **Unified Communication**: Combined view of review feedback + general comments + replies.
    - [x] **Reply System**: Nested replies to comments for back-and-forth discussion.
    - [ ] **Mentions**: `@user` tagging to notify specific people.
    - [ ] **Co-Authorship**: Allow multiple users to edit/submit a single proposal.

- [x] **Revision Management**
    - [x] **Supplement Request**: Reviewers can request proposer to revise during review.
    - [x] **Version History**: Track all revisions with snapshots.
    - [x] **Diff Comparison**: Show changes between versions (old → new).
    - [x] **Deadline Tracking**: Admin-configurable deadline for supplement requests (default: 1 week).

- [x] **Notification System**
    - [x] **In-App Notifications**: Bell icon with unread count badge and dropdown.
    - [x] **Mark as Read**: Individual and bulk read status management.
    - [x] **Event-driven Alerts**: Notify on comments, replies, supplement requests, status changes.

- [x] **Auto-Finalize**
    - [x] Automatically advance proposals when all required reviewers complete evaluation.

- [ ] **Advanced Lifecycle Management**
    - [ ] **Return for Modification**: Instead of simple Rejection, allow reviewers to send back for edits.
    - [ ] **Post-Implementation Tracking**: Track *actual* ROI 3/6/12 months after implementation.
    - [ ] **Duplicate Detection**: Suggest similar existing ideas during submission to prevent duplicates.

- [ ] **Gamification & Culture**
    - [ ] **Leaderboards**: "Idea King of the Month", "Top Department".
    - [ ] **Hall of Fame**: Showcase best practices with before/after photos.
    - [ ] **Badges**: Achievements (e.g., "First S-Grade", "10 Proposals").

## Phase 10: Admin Proposal Management ✅
Complete administrative control over all proposals in the system.

- [x] **Proposal Actions (Individual)**
    - [x] **Soft Delete**: Mark as deleted (hidden from all views, recoverable).
    - [x] **Archive**: Move to archive (still searchable, read-only).
    - [x] **Hide/Unhide**: Toggle visibility without deletion.
    - [x] **Force Status Change**: Admin can manually set any proposal status.
    - [x] **Transfer Ownership**: Reassign proposal to different proposer.

- [x] **Bulk Operations**
    - [x] **Multi-Select**: Checkbox selection for batch processing.
    - [x] **Bulk Archive**: Archive multiple old proposals at once.
    - [x] **Bulk Delete**: Soft delete multiple proposals.
    - [ ] **Bulk Export**: Export selected proposals to Excel/CSV. (Deferred)

- [x] **Admin Proposal List UI**
    - [x] **Dedicated Page**: `/admin_proposals` for full management view.
    - [x] **Extended Filters**: By status, search, visibility.
    - [x] **Trash/Archive Views**: Separate tabs for deleted and archived proposals.
    - [x] **Restore Function**: Recover deleted proposals.
    - [x] **Audit Trail**: Log all admin actions with timestamp and reason.

- [x] **Data Integrity**
    - [x] **Confirmation Dialogs**: Require explicit confirmation for destructive actions.
    - [x] **Reason Input**: Optional reason field for delete/archive actions.

## Verification Plan
- **Manual Testing**:
    1.  **Submit Proposal**: Create a new proposal and verify it appears on the Dashboard.
    2.  **Review Flow**: Log in as a reviewer, approve the proposal, and verify status change.
    3.  **Settings**: Change mileage rules, save, reload page, and verify settings persist.


