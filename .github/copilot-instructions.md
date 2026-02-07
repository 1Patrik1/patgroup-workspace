# PATGROUP Workspace - Copilot Instructions

## Project Overview

Full-stack construction management system (stavba manager) built with **vanilla JavaScript and Node.js**. Zero-framework architecture with in-memory state persistence, OpenTelemetry tracing, and role-based access control. Deployed on Render.com free tier.

## Architecture

### Backend ([app/index.js](../app/index.js))

-   **Pure Node.js HTTP server** - no Express/Fastify, manual route handling in `handleApi()`
-   **In-memory state** with JSON file persistence ([DATA/store.json](../DATA/store.json))
-   **CRITICAL State Rule**: `projects` array ALWAYS seeded from code defaults on startup, NEVER loaded from disk
-   Other entities (`photos`, `reports`, `protocols`, `attendance`) loaded from `store.json` if exists
-   **OpenTelemetry tracing** via [tracing.js](../tracing.js) - **MUST be first import** before any modules
-   Manual span creation for `loadState`/`saveState` operations using `@opentelemetry/api`

### Frontend ([public/js/app.js](../public/js/app.js))

-   **Single-file SPA** - `StavbaManager` class manages entire application lifecycle
-   **No build step** - vanilla JS served directly, no transpilation
-   **Client-side demo auth** stored in `localStorage` (not production-ready)
-   **Role-based UI**: permissions object controls which nav sections display per role
-   **Web APIs**: Geolocation API for attendance GPS validation, MediaDevices API for camera
-   **Demo credentials**: `monter/monter123`, `technik/technik123`, `vedouci/vedouci123`, `admin/admin123`

### Data Flow

1. User auth → `localStorage` (client-side only, no backend validation)
2. API calls: Frontend `apiCall()` → Backend route switch → In-memory `state` object
3. Mutations trigger `saveState()` → Writes to `DATA/store.json` synchronously
4. **Projects exception**: Always from code defaults, never persisted to disk

## Critical Patterns

### State Management - The "Projects Rule"

```javascript
// ❌ WRONG - Projects should NEVER be loaded from store.json
if (parsed.projects) state.projects = parsed.projects;

// ✅ CORRECT - Always use hardcoded defaults
state.projects = [
    { id: 1, name: "Hala Sever", ... },
    { id: 2, name: "Bydleni Jih", ... },
    { id: 3, name: "Most Zapad", ... }
];

// ✅ CORRECT - Other entities loaded conditionally
if (parsed.photos !== undefined) state.photos = parsed.photos;
if (parsed.attendance !== undefined) {
    state.attendance = { ...state.attendance, ...parsed.attendance };
    // Re-hydrate Date objects from ISO strings
    if (state.attendance.checkInTime) {
        state.attendance.checkInTime = new Date(state.attendance.checkInTime);
    }
}
```

### API Response Helpers (No Express)

```javascript
const sendText = (res, status, body) => {
    res.writeHead(status, { "Content-Type": "text/plain" });
    res.end(body);
};

const sendJson = (res, status, payload) => {
    res.writeHead(status, { "Content-Type": "application/json" });
    res.end(JSON.stringify(payload));
};
```

### Static File Serving Security

-   Routes starting with `/app/` serve from `public/` directory
-   **Path traversal protection**: Reject normalized paths containing `..`
-   Content-Type detection via file extension mapping (no mime-types library)

## Key Workflows

### Running & Tracing

```bash
npm start              # Standard mode (port 3000)
npm run start:trace    # With OpenTelemetry tracing enabled
PORT=8080 npm start    # Custom port
```

**Tracing Setup**: Export to `http://localhost:4318/v1/traces` by default (override via `OTEL_EXPORTER_OTLP_ENDPOINT`)

### Formatting & Testing

```bash
npm run format         # Prettier with 4-space indentation
npm test               # Runs health check scripts
npm run check          # /health endpoint only
npm run check-server   # / endpoint only
```

### Deployment (Render.com)

-   Auto-detects [render.yaml](../render.yaml) on push
-   Production PORT: `10000`, `NODE_ENV=production`
-   Health check endpoint: `/health`
-   **Branch protection**: Requires 1 PR approval before merge to `master`

### Development Setup

-   VS Code tasks: `Format: Prettier`, `Start: Server` (background)
-   Launch configs: Debug app server, current file (Node/Python)
-   Format-on-save enabled, trailing whitespace trimmed

## API Endpoints

| Method | Path                       | Body                                        | Response                                    |
| ------ | -------------------------- | ------------------------------------------- | ------------------------------------------- |
| GET    | `/api/projects`            | -                                           | List of projects with geo coords            |
| POST   | `/api/attendance/checkin`  | `{projectId, location}`                     | `{status: "in", projectId, checkedInAt}`    |
| POST   | `/api/attendance/checkout` | -                                           | `{status: "out", durationMs, checkedOutAt}` |
| GET    | `/api/photos`              | -                                           | List of photos with base64 images           |
| POST   | `/api/photos`              | `{image, description, projectId, location}` | Created photo entry                         |
| POST   | `/api/reports`             | Report fields                               | Created report                              |
| POST   | `/api/protocols`           | Protocol fields                             | Created protocol                            |

**Error Handling**:

-   400 for invalid/missing data (`{error: "message"}`)
-   404 for unknown routes
-   5MB payload limit with auto-reject

## Frontend Integration Points

### StavbaManager Class Lifecycle

```javascript
init() → checkLogin() → showApp() OR showLogin()
// After login: localStorage saves user, role determines visible nav items
```

### Permissions System

```javascript
permissions = {
    monter: ["dashboard", "projects", "attendance", "photos", "time"],
    technik: [...monter, "reports"],
    stavbyvedouci: [...technik, "protocols"],
    administrator: [...all, "settings"],
};
```

### Geolocation Pattern

-   Requests user location on check-in
-   Validates distance from project site (GPS tolerance)
-   Stores lat/lng with photos/reports for audit trail

## Dependencies

**Production:**

-   `@opentelemetry/*` packages for distributed tracing
-   Node.js built-ins only (`http`, `fs`, `path`)

**Dev:**

-   `prettier@^2.8.8` for formatting

**Frontend (CDN):**

-   Leaflet 1.9.4 for map display

## Conventions

-   **4-space indentation** (enforced by `.editorconfig` + Prettier)
-   **Exit codes** (health checks): 0=success, 2=unexpected response, 3=network error
-   **PORT config**: Always `process.env.PORT || 3000`
-   **No external frameworks**: Vanilla JS/Node only
-   **Manual span attributes**: Tag tracing spans with `data.file`, `data.size`, `http.route`, etc.

## Common Tasks

**Adding a new API endpoint:**

1. Add route case in `handleApi()`
2. Parse body with `await parseBody(req)` if POST
3. Validate against `state.projects` or other state
4. Mutate state, call `saveState()`
5. Wrap in tracer span for observability

**Adding a new frontend screen:**

1. Add HTML section to [public/index.html](../public/index.html)
2. Add nav item to appropriate role in `permissions`
3. Implement screen logic in [public/js/app.js](../public/js/app.js) `StavbaManager` class
4. Add CSS to [public/css/style.css](../public/css/style.css)

**Debugging state issues:**

-   Check `DATA/store.json` for persisted data
-   Remember projects are NEVER persisted - always from code defaults
-   Verify `checkInTime` is properly parsed as Date object after load
