# dataops_FE Project Details (dataops-orchestrator-frontend)

## Overview
This is a React 19 application built with Vite and TypeScript. It uses Tailwind CSS (`@tailwindcss/vite`) for styling, `react-router-dom` for routing, `recharts` for charting, and `motion` (Framer Motion) for animations.

## State Management (`hooks/useStore.tsx`)

The application uses a central React Context (`StoreContext` / `useStore`) powered by a `useReducer` to manage global state. 

- **State provided:**
  - `pipelines`: Array of pipeline data.
  - `incidents`: Array of incident data.
  - `agents`: Array of agent status data.
  - `logs`: Array of recent log entries.
  - `simulating`: Boolean indicator.
  - `connected`: Boolean indicator for WebSocket connection.
  - `activeAgentRoles`: Object tracking which agents are currently "thinking" (live highlighting).

- **Methods provided:** 
  - `triggerIncident`, `toggleSimulation`, `approveIncident`, `rejectIncident`, `refresh`

- **Data Fetching & Subscriptions:**
  - **Bootstrap:** On mount, fetches initial snapshots of `pipelines`, `incidents`, `agents`, and `health`.
  - **Polling:** Automatically polls agent statuses every 30 seconds (`api.agents()`).
  - **WebSocket:** Connects to `ws://{host}/ws?token={token}` to receive live events (`snapshot`, `pipelines_update`, `incident_update`, `log`, `agent_started`, `agent_completed`).

---

## API Surface (`services/api.ts`)

The project uses a custom `fetch` wrapper (`req<T>`) to interact with the backend API (`http://122.163.121.176:3004`).
- **Auth:** Uses `localStorage` (`dataops:jwt`) for JWT tokens. The wrapper intercepts 401s to clear the token and redirect to `/login`.

### Endpoints
1. **Auth & Health**
   - `login`: POST `/api/auth/login`
   - `me`: GET `/api/auth/me`
   - `health`: GET `/api/health`
2. **Pipelines**
   - `pipelines`: GET `/api/pipelines`
   - `pipeline`: GET `/api/pipelines/:id`
3. **Incidents**
   - `incidents`: GET `/api/incidents`
   - `incident`: GET `/api/incidents/:id`
   - `triggerIncident`: POST `/api/incidents/trigger`
   - `approveIncident`: POST `/api/incidents/:id/approve`
   - `rejectIncident`: POST `/api/incidents/:id/reject`
   - `deleteIncident`: DELETE `/api/incidents/:id`
   - `deleteIncidents`: DELETE `/api/incidents?status={status}`
4. **Agents & Memory**
   - `agents`: GET `/api/agents`
   - `memory`: GET `/api/memory?kind={kind}`
   - `searchMemory`: GET `/api/memory/search`
   - `createMemory`: POST `/api/memory`
5. **Logs & Tools**
   - `audit`: GET `/api/audit?limit={limit}`
   - `tools`: GET `/api/tools`
6. **Connectors**
   - `connectors`: GET `/api/connectors`
   - `connectorTypes`: GET `/api/connectors/types`
   - `getConnector`: GET `/api/connectors/:id`
   - `upsertConnector`: POST `/api/connectors`
   - `deleteConnector`: DELETE `/api/connectors/:id`
   - `testConnector`: POST `/api/connectors/:id/test`
7. **Recommendations**
   - `recommendations`: GET `/api/recommendations`
   - `regenerateRecommendations`: POST `/api/recommendations/regenerate`
   - `updateRecommendation`: POST `/api/recommendations/:id`
8. **Metrics**
   - `metricsHealth`: GET `/api/metrics/health`
   - `metricsSummary`: GET `/api/metrics/summary`

---

## UI Bindings & Routing (`App.tsx`)

The router defines a set of public pages and a protected dashboard shell.

### Public Routes
- **`/`**: `<LandingPage />`
- **`/login`**: `<LoginPage />`

### Protected Routes (`/app/*`)
Access is guarded by `<RequireAuth />` which checks `auth.isAuthed()`. The internal routes are wrapped in a `<Shell />` component that provides the `<Sidebar />` and initializes the `<StoreProvider>`.

- **`/app/`**: `<DashboardPage />`
- **`/app/pipelines`** & **`/app/pipelines/:id`**: `<PipelinesPage />`
- **`/app/incidents`** & **`/app/incidents/:id`**: `<IncidentsPage />`
- **`/app/agents`**: `<AgentsPage />`
- **`/app/memory`**: `<MemoryPage />`
- **`/app/recommendations`**: `<RecommendationsPage />`
- **`/app/connectors`**: `<ConnectorsPage />`
- **`/app/audit`**: `<AuditPage />`

## Summary
The `dataops_FE` uses native `fetch` over `axios` and relies on React Context (`useStore`) and `useReducer` rather than pure component-level fetching or Redux. State is kept fresh through an active WebSocket connection and automatic background polling, particularly for agent states. The UI seamlessly routes into a unified dashboard shell under `/app/`.
