# Flowday - AI Task Dashboard & Weekly Planner (Angular LTS)

Modern Angular LTS (v18/v19) application built with Standalone Components, Signals (`signal`, `computed`, `input`, `output`), native control flow (`@if`, `@for`, `@switch`), `OnPush` change detection, Tailwind CSS, and `HttpClient` server integration.

## Architecture & Component Breakdown
- `src/app/core/models/`: Strongly typed interfaces (`TaskItem`, `DashboardSummary`, `WeeklyPlanResponse`, `GoogleAccountProfile`).
- `src/app/core/services/`:
  - `ApiService`: Reactive `HttpClient` wrapper with automatic request logging and fallback simulation.
  - `TaskService`: Manages Dashboard state and communicates with `/api/v1/dashboard`, `/api/v1/tasks`, and `/api/v1/tasks/smart-reschedule`.
  - `PlannerService`: Manages AI Weekly Planner state and communicates with `/api/v1/planner/weekly`, `/api/v1/planner/reanalyze`, and `/api/v1/planner/accept`.
  - `GoogleAuthService`: Manages OAuth 2.0 state with `/api/v1/auth/google/*`.
- `src/app/core/interceptors/auth.interceptor.ts`: Functional `HttpInterceptorFn` attaching Bearer tokens and client headers to every server request.
- `src/app/shared/components/`: `TopBarComponent`, `BottomNavComponent`, `GoogleOauthModalComponent`, `ToastComponent`, and `PriorityBadgeComponent`.
- `src/app/features/dashboard/`: `DashboardComponent` + child components (`BentoStatsComponent`, `AiInsightCardComponent`, `FocusTaskListComponent`).
- `src/app/features/planner/`: `PlannerComponent` + child components (`PlanningTargetComponent`, `CapacityBudgetComponent`, `ProposedTasksComponent`).

## Running Locally
1. Install dependencies: `npm install`
2. Start dev server: `npm start` (opens on `http://localhost:4200`)
