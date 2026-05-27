# DataOps_1 Project Details (pipeline-monitor-frontend)

## Overview
This is a React application built with Vite (`pipeline-monitor-frontend`). It uses `react-router-dom` for routing, `axios` for API requests, `framer-motion` for animations, `recharts` for charts, and Tailwind CSS for styling. 

## Contexts & State Management

### 1. `AuthContext`
Manages the authentication state of the application.
- **State provided:** `user`, `loading`
- **Methods provided:** `login`, `register`, `logout`
- **Dependencies:** Interacts with the `authApi` for registration, login, and fetching user details.
- **Storage:** Stores `auth_token` in `localStorage`.

### 2. `RealtimeContext`
Manages a persistent WebSocket connection to receive real-time updates.
- **State provided:** `connected`, `lastEvent`
- **Methods provided:** `subscribe(handler)` - allows components to listen to real-time events.
- **Connection Details:** Connects to `ws://` or `wss://{host}/ws?token={auth_token}`.
- **Features:** Auto-reconnection with exponential backoff and a heartbeat mechanism (ping every 25s).

---

## API Surface (`src/services/api.js`)

The application uses `axios` to communicate with the backend. 
- **Base URL:** `VITE_API_BASE` environment variable or `/api/v1` as fallback.
- **Interceptors:** 
  - **Request:** Automatically injects the `Authorization: Bearer {token}` header from `localStorage`.
  - **Response:** Automatically handles `401 Unauthorized` responses by clearing the token and redirecting the user to `/login`.

### 1. Auth API (`authApi`)
- `POST /auth/register` - Registers a new user (`register`).
- `POST /auth/login` - Authenticates a user (`login`).
- `GET /auth/me` - Fetches the currently authenticated user's details (`me`).

### 2. Connectors API (`connectorsApi`)
- `GET /connectors` - Lists all connectors (`list`).
- `GET /connectors/:id` - Fetches a specific connector (`get`).
- `POST /connectors` - Creates a new connector (`create`).
- `PATCH /connectors/:id` - Updates an existing connector (`update`).
- `DELETE /connectors/:id` - Removes a connector (`remove`).
- `POST /connectors/:id/test` - Tests a connector's connection (`test`).
- `POST /connectors/:id/sync` - Initiates a sync for a connector (`sync`).

### 3. Pipelines API (`pipelinesApi`)
- `GET /pipelines` - Lists all pipelines, supports query params (`list`).
- `GET /pipelines/:id` - Fetches details for a specific pipeline (`get`).
- `GET /dashboard/stats` - Fetches aggregated statistics for the dashboard (`stats`).

### 4. Runs API (`runsApi`)
- `GET /runs/:id` - Fetches a specific run's details (`get`).
- `GET /runs/:id/logs` - Fetches the logs for a specific run (`logs`).
- `GET /runs/:id/analysis` - Fetches the analysis for a specific run (`analysis`).
- `POST /runs/:id/analyze` - Triggers an analysis for a specific run, supports `force` query param (`analyze`).
- `POST /runs/:id/auto-fix` - Applies an auto-fix to a specific run (`applyFix`).

---

## UI Bindings & Routing (`src/App.jsx`)

The application uses `<Routes>` to map paths to specific components. Access to routes is controlled via `ProtectedRoute` and `PublicOnly` wrapper components that read the `user` state from `AuthContext`.

### Public Routes
These pages are accessible only when the user is *not* authenticated.
- **`/login`** -> `<Login />`
  - Uses `AuthContext` (`login` method) to authenticate the user and redirect upon success.
- **`/register`** -> `<Register />`
  - Uses `AuthContext` (`register` method) to register the user.

### Protected Routes
These pages are accessible only when the user is authenticated.
- **`/` (Dashboard)** -> `<Dashboard />`
  - Uses `pipelinesApi.stats()` to display aggregated statistics.
- **`/connectors`** -> `<Connectors />`
  - Uses `connectorsApi` to list, create, update, delete, test, and sync connectors.
- **`/pipelines`** -> `<Pipelines />`
  - Uses `pipelinesApi.list()` to display the list of pipelines.
- **`/pipelines/:id`** -> `<PipelineDetail />`
  - Uses `pipelinesApi.get(id)` to load pipeline-specific information.
- **`/runs/:id`** -> `<RunDetail />`
  - Uses `runsApi.get()`, `runsApi.logs()`, `runsApi.analysis()`, `runsApi.analyze()`, and `runsApi.applyFix()` to show detailed information and allow interactions for a specific pipeline run.

---

## Summary
The UI is heavily reliant on a centralized API service module (`services/api.js`). State flows downwards via the `AuthContext` (for user and auth state) and `RealtimeContext` (for live WebSocket events). The component hierarchy is protected by route guards ensuring secure access to API-bound views.
